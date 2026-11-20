/**
 * LLM-based self-healing layer for broken UI locators.
 *
 * Previously used the OpenAI API. Now uses the Hugging Face Inference API
 * so the framework can run against any hosted or open-source instruction-tuned
 * model (e.g. Mistral-7B-Instruct, Llama-3-8B-Instruct) without an OpenAI key.
 */

import * as dotenv from 'dotenv';
dotenv.config();

const HF_API_URL = 'https://api-inference.huggingface.co/models';
// Any instruction-tuned model works; override via env var if you want a different one.
const HF_MODEL = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

export interface HealingContext {
  /** The selector that failed to locate an element */
  brokenSelector: string;
  /** A short description of what the element is (e.g. "Login submit button") */
  elementDescription: string;
  /** Simplified DOM snippet around where the element used to be, or the full page HTML */
  domSnippet: string;
}

export interface HealingResult {
  suggestedSelector: string;
  confidence: 'high' | 'medium' | 'low';
  rawModelOutput: string;
}

/**
 * Calls the Hugging Face Inference API with a prompt describing the broken
 * selector and surrounding DOM, and asks the model to suggest a replacement
 * CSS or XPath selector.
 */
export async function suggestSelector(ctx: HealingContext): Promise<HealingResult> {
  if (!HF_API_KEY) {
    throw new Error(
      'Missing HUGGINGFACE_API_KEY. Set it in your .env file or CI secrets (see .env.example).'
    );
  }

  const prompt = buildPrompt(ctx);

  const response = await fetch(`${HF_API_URL}/${HF_MODEL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 150,
        temperature: 0.2,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Hugging Face Inference API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText: string = Array.isArray(data) ? data[0]?.generated_text ?? '' : data.generated_text ?? '';

  const selector = extractSelector(rawText);

  return {
    suggestedSelector: selector,
    confidence: selector ? 'high' : 'low',
    rawModelOutput: rawText,
  };
}

function buildPrompt(ctx: HealingContext): string {
  return [
    '[INST] You are a test automation assistant. A Playwright/Selenium locator broke because the DOM changed.',
    `Broken selector: ${ctx.brokenSelector}`,
    `Element it was supposed to find: ${ctx.elementDescription}`,
    'Current DOM snippet:',
    '```html',
    ctx.domSnippet,
    '```',
    'Suggest ONE replacement CSS selector (or XPath if CSS is not possible) that reliably',
    'targets the same element in the current DOM. Respond with ONLY the selector on a single',
    'line, no explanation. [/INST]',
  ].join('\n');
}

function extractSelector(rawText: string): string {
  // Model should return just the selector; strip whitespace, backticks, and any stray prose lines.
  const cleaned = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .find((l) => !l.toLowerCase().startsWith('here') && !l.toLowerCase().startsWith('the '));

  return (cleaned || '').replace(/`/g, '').trim();
}
