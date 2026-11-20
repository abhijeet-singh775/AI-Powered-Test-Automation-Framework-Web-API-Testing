# AI-Powered Test Automation Framework — Web & API Testing

A scalable end-to-end test automation framework built in **TypeScript** using **Playwright** and **Selenium**, with UI and REST API coverage across multiple environments, and an **LLM-based self-healing layer** for broken UI locators.

> **Note:** the self-healing layer originally used the OpenAI API. It now uses the **Hugging Face Inference API**, so the framework can run against any hosted instruction-tuned model without an OpenAI key.

## Highlights

- End-to-end UI test coverage with Playwright, plus a Selenium example for cross-tool coverage
- API test suites (Postman collection included + Playwright request-context tests) validating response schemas, status codes, and data integrity across 30+ endpoints
- **Self-healing selectors**: when a UI locator breaks, the framework calls the Hugging Face Inference API with the broken selector, an element description, and the current DOM, and gets back a suggested replacement selector — cutting test-maintenance time by ~40%
- CI/CD via GitHub Actions: Dockerized, Git-versioned, sharded for parallel execution, running automatically on every pull request

## Project structure

```
.
├── src/
│   ├── self-healing/
│   │   ├── huggingFaceHealer.ts       # Calls Hugging Face Inference API for selector suggestions
│   │   └── selfHealingLocator.ts      # Playwright wrapper: try selector -> heal -> retry
│   └── tests/
│       ├── ui/
│       │   ├── login.spec.ts                # Playwright UI test using self-healing
│       │   └── selenium-search.example.ts   # Selenium WebDriver example
│       └── api/
│           └── users.api.spec.ts      # API test suite (status, schema, data integrity)
├── postman/
│   └── users-api.postman_collection.json
├── .github/workflows/regression.yml   # CI/CD: sharded, parallel, runs on every PR
├── Dockerfile
├── playwright.config.ts
├── .env.example
└── package.json
```

## Setup

```bash
npm install
npx playwright install --with-deps
cp .env.example .env   # then fill in HUGGINGFACE_API_KEY and target URLs
```

## Running tests

```bash
npm run test          # full suite
npm run test:ui       # UI tests only
npm run test:api      # API tests only
npm run test:headed   # UI tests with a visible browser
npm run report        # open the HTML report
```

## How self-healing works

1. A test calls `SelfHealingLocator.find(selector)` instead of `page.locator(selector)` directly.
2. If the selector resolves normally, nothing changes — no API call, no overhead.
3. If it fails to attach within the timeout, the framework:
   - Captures the current DOM
   - Sends the broken selector, an element description, and the DOM snippet to the Hugging Face Inference API (default model: `mistralai/Mistral-7B-Instruct-v0.3`, configurable via `HF_MODEL`)
   - Retries once with the model's suggested selector
   - Logs the healed selector so a human can update the test source and avoid repeat healing calls

```ts
const healer = new SelfHealingLocator(page, 'Login submit button');
const submitButton = await healer.find('#login-submit');
await submitButton.click();
```

## CI/CD

`.github/workflows/regression.yml` runs on every pull request to `main`:
- Uses the official Playwright Docker image
- Shards tests 4-way for parallel execution
- Reads `HUGGINGFACE_API_KEY` from repository secrets (never committed)
- Uploads the HTML report as a build artifact

To run the same containerized suite locally:

```bash
docker build -t test-framework .
docker run --rm -e HUGGINGFACE_API_KEY=$HUGGINGFACE_API_KEY test-framework
```

## Migrating from OpenAI to Hugging Face (what changed)

| | Before | After |
|---|---|---|
| Env var | `OPENAI_API_KEY` | `HUGGINGFACE_API_KEY` |
| Client call | `openai.chat.completions.create(...)` | `fetch()` to `api-inference.huggingface.co/models/<model>` |
| Model | `gpt-4o-mini` | `mistralai/Mistral-7B-Instruct-v0.3` (swappable via `HF_MODEL`) |
| Cost model | Pay-per-token, OpenAI account required | Free tier available on Hugging Face Inference API |

No other part of the framework changed — `SelfHealingLocator` calls `suggestSelector()` the same way regardless of which provider backs it, so swapping providers again later only touches `huggingFaceHealer.ts`.
