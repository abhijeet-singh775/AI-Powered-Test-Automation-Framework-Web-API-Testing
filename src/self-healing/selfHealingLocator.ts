import { Page, Locator } from '@playwright/test';
import { suggestSelector } from './huggingFaceHealer';

/**
 * Wraps Playwright's locator resolution: tries the primary selector first,
 * and if it can't find/act on the element, asks the Hugging Face-backed
 * healer for a replacement selector, retries once, and logs the outcome
 * so a human can review and update the test source later.
 */
export class SelfHealingLocator {
  constructor(private page: Page, private description: string) {}

  async find(primarySelector: string, timeoutMs = 5000): Promise<Locator> {
    const locator = this.page.locator(primarySelector);

    try {
      await locator.waitFor({ state: 'attached', timeout: timeoutMs });
      return locator;
    } catch {
      console.warn(
        `[self-healing] Selector broke: "${primarySelector}" (${this.description}). Requesting a healed selector...`
      );

      const domSnippet = await this.page.content();
      const result = await suggestSelector({
        brokenSelector: primarySelector,
        elementDescription: this.description,
        domSnippet: domSnippet.slice(0, 8000), // keep prompt size reasonable
      });

      if (!result.suggestedSelector) {
        throw new Error(
          `[self-healing] Could not heal selector "${primarySelector}" for "${this.description}".`
        );
      }

      const healedLocator = this.page.locator(result.suggestedSelector);
      await healedLocator.waitFor({ state: 'attached', timeout: timeoutMs });

      console.log(
        `[self-healing] Healed "${primarySelector}" -> "${result.suggestedSelector}" ` +
          `(confidence: ${result.confidence}). Update the test source to avoid repeat healing.`
      );

      return healedLocator;
    }
  }
}
