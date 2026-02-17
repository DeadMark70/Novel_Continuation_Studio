import { test, expect } from '@playwright/test';

function ssePayload(text) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;
}

async function saveSettings(page) {
  const saveButton = page.getByRole('button', { name: 'Save Configuration' });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  await expect(page.getByText('Saved.')).toBeVisible();
}

async function openSettingsReady(page) {
  await page.goto('/settings');
  await expect(page.locator('#nim-selected-model')).toHaveValue(/.+/);
}

test.describe('Novel Continuation Studio smoke', () => {
  test.describe.configure({ mode: 'serial' });
  test('home renders core navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Novel Continuation/i })).toBeVisible();
    await expect(page.getByRole('button', { name: '新建創作' })).toBeVisible();
    await expect(page.getByRole('link', { name: /History/i })).toBeVisible();
  });

  test('settings page can open and show prompt editor defaults', async ({ page }) => {
    await openSettingsReady(page);
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
    await openSettingsReady(page);
    const saveButton = page.getByRole('button', { name: 'Save Configuration' });
    await expect(saveButton).toBeDisabled();
    await page.getByRole('tab', { name: 'Provider' }).click();
    const modelInput = page.locator('#nim-selected-model');
    await modelInput.fill(`meta/llama3-70b-instruct-test-${Date.now()}`);
    await expect(saveButton).toBeEnabled();
  });

  test('settings debug panel can be toggled', async ({ page }) => {
    await openSettingsReady(page);
    await page.getByRole('button', { name: 'Show Debug' }).click();
    await expect(page.getByText(/persistCount=/)).toBeVisible();
  });

  test('phase 2 resume buttons are task-specific and update availability after 2A generation', async ({ page }) => {
    await page.route('**/api/nim/generate', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: ssePayload('mock-outline-subtask-output'),
      });
    });
    await page.route('**/api/openrouter/generate', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: ssePayload('mock-outline-subtask-output'),
      });
    });

    await page.goto('/');
    await page.locator('#novel-content').fill('Smoke novel for phase 2 resume button coverage.');
    await page.getByText('Phase II: Story Outline', { exact: false }).first().click();

    const resume2AButton = page.getByRole('button', { name: 'Resume 2A' });
    const resume2BButton = page.getByRole('button', { name: 'Resume 2B' });
    await expect(resume2AButton).toBeVisible();
    await expect(resume2BButton).toBeVisible();
    await expect(resume2AButton).toBeDisabled();
    await expect(resume2BButton).toBeDisabled();

    await page.getByPlaceholder(/Make the protagonist more aggressive/i).fill('[[OUTLINE_TASK:2A]]');
    await page.getByRole('button', { name: /Generate 2A\+2B|Regenerate 2A\+2B/ }).click();

    await expect(resume2AButton).toBeEnabled({ timeout: 15000 });
    await expect(resume2BButton).toBeDisabled();
  });

  test('provider + model selection can be saved in current session', async ({ page }) => {
    const openrouterModel = `openai/gpt-4o-mini-e2e-${Date.now()}`;
    await openSettingsReady(page);
    await page.getByRole('button', { name: 'Show Debug' }).click();
    const persistBeforeText = await page.getByText(/persistCount=/).innerText();
    const persistBefore = Number(persistBeforeText.replace('persistCount=', ''));

    await page.getByRole('tab', { name: 'Provider' }).click();
    await page.locator('#openrouter-selected-model').fill(openrouterModel);
    await expect(page.locator('#openrouter-selected-model')).toHaveValue(openrouterModel);
    await page.locator('#active-provider').click();
    await page.getByRole('option', { name: 'OpenRouter' }).click();
    await saveSettings(page);

    await expect(page.locator('#active-provider')).toContainText('OpenRouter');
    const persistAfterText = await page.getByText(/persistCount=/).innerText();
    const persistAfter = Number(persistAfterText.replace('persistCount=', ''));
    expect(persistAfter).toBeGreaterThan(persistBefore);
  });

  test('phase routing selection is applied after save', async ({ page }) => {
    const analysisModel = `openai/gpt-4o-mini-phase-${Date.now()}`;
    await openSettingsReady(page);
    await page.getByRole('tab', { name: 'Phase Routing' }).click();
    await page.locator('#analysis-provider').click();
    await page.getByRole('option', { name: 'OpenRouter' }).click();
    await page.locator('#analysis-model').fill(analysisModel);
    await saveSettings(page);

    await page.getByRole('tab', { name: 'Model Params' }).click();
    await expect(page.getByText(/Phase 1 Analysis/)).toBeVisible();
    await expect(page.getByText(new RegExp(`model=${analysisModel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))).toBeVisible();
  });

  test('model params validation appears and save succeeds with valid values', async ({ page }) => {
    await openSettingsReady(page);
    await page.getByRole('tab', { name: 'Model Params' }).click();

    const topPInput = page.locator('#nim-default-topP');
    await topPInput.fill('1.5');
    await expect(page.getByText('Must be between 0 and 1.')).toBeVisible();

    await topPInput.fill('0.55');
    await page.locator('#nim-default-temperature').fill('0.8');
    await expect(page.getByText('Must be between 0 and 1.')).toHaveCount(0);
    await saveSettings(page);
  });
});
