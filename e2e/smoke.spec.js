import { test, expect } from '@playwright/test';

test.describe('Novel Continuation Studio smoke', () => {
  test('home renders core navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Novel Continuation/i })).toBeVisible();
    await expect(page.getByRole('button', { name: '新建創作' })).toBeVisible();
    await expect(page.getByRole('link', { name: /History/i })).toBeVisible();
  });

  test('settings page can open and show prompt editor defaults', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await page.getByRole('tab', { name: 'Prompts' }).click();
    await expect(page.getByRole('textbox', { name: 'Prompt Template' })).toBeVisible();
    await expect(page.getByText(/Using default content|Modified from default/)).toBeVisible();
  });

  test('history page renders version history tab and can return to studio', async ({ page }) => {
    await page.goto('/history');
    await page.getByRole('tab', { name: 'Version History' }).click();
    await expect(page.getByText('新建創作')).toBeVisible();
    await page.getByRole('link', { name: 'Back to Studio' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('settings save button toggles with dirty state', async ({ page }) => {
    await page.goto('/settings');
    const saveButton = page.getByRole('button', { name: 'Save Configuration' });
    await expect(saveButton).toBeDisabled();
    await page.getByRole('tab', { name: 'Provider' }).click();
    const modelInput = page.locator('#nim-selected-model');
    await modelInput.fill('meta/llama3-70b-instruct-test');
    await expect(saveButton).toBeEnabled();
  });

  test('settings debug panel can be toggled', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Show Debug' }).click();
    await expect(page.getByText(/persistCount=/)).toBeVisible();
  });
});
