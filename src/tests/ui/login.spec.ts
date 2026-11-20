import { test, expect } from '@playwright/test';
import { SelfHealingLocator } from '../../self-healing/selfHealingLocator';

test.describe('Login flow (self-healing enabled)', () => {
  test('user can log in with valid credentials', async ({ page }) => {
    await page.goto('/login');

    const healer = new SelfHealingLocator(page, 'Login submit button');

    // If '#login-submit' no longer exists in the DOM, the healer will ask
    // Hugging Face for a replacement selector and retry automatically.
    const usernameField = page.locator('#username');
    const passwordField = page.locator('#password');
    const submitButton = await healer.find('#login-submit');

    await usernameField.fill(process.env.TEST_USERNAME || 'demo-user');
    await passwordField.fill(process.env.TEST_PASSWORD || 'demo-pass');
    await submitButton.click();

    await expect(page).toHaveURL(/dashboard/);
  });
});
