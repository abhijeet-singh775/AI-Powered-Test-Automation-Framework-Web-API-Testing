/**
 * Example Selenium WebDriver script, kept alongside the Playwright suite to
 * demonstrate multi-tool coverage referenced in the framework description.
 * Run standalone with: npx ts-node src/tests/ui/selenium-search.example.ts
 */
import { Builder, By, until } from 'selenium-webdriver';

async function run() {
  const driver = await new Builder().forBrowser('chrome').build();

  try {
    await driver.get('https://example.com');
    const heading = await driver.wait(until.elementLocated(By.css('h1')), 5000);
    const text = await heading.getText();
    console.log('Page heading:', text);
  } finally {
    await driver.quit();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
