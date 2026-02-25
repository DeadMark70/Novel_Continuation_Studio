import { test, expect, devices } from '@playwright/test';
import {
  ANALYSIS_CONTRACT_VALID_TEXT,
  ssePayloadFromText,
} from './fixtures/analysis-contract.js';

async function uploadSampleNovel(page, suffix = '') {
  await page.goto('/');
  await page.locator('#novel-content').fill(`Sample novel content ${suffix}\nChapter intro.`);
}

async function openPhase(page, phaseLabel) {
  await page.getByText(phaseLabel, { exact: false }).first().click();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test.describe('Workflow resilience', () => {
  test('Flow A: compression -> analysis -> outline transition survives mocked SSE', async ({ page }) => {
    // Keep mock output aligned with section-contract requirements to avoid false E2E failures.
    await page.route('**/api/nim/generate', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: ssePayloadFromText(ANALYSIS_CONTRACT_VALID_TEXT),
      });
    });

    await uploadSampleNovel(page, 'flow-a');
    await page.getByRole('button', { name: /Start Compression/i }).click();
    await openPhase(page, 'Phase II: Story Outline');

    await expect(page.getByRole('button', { name: /Generate 2A\+2B|Regenerate 2A\+2B|Generate Outline/i })).toBeVisible({
      timeout: 30000,
    });
  });

  test('handles truncated SSE stream gracefully', async ({ page }) => {
    await page.route('**/api/nim/generate', async (route) => {
      const truncatedBody = [
        `data: ${JSON.stringify({ choices: [{ delta: { content: '部分內容' }, finish_reason: null }] })}\n\n`,
        `data: ${JSON.stringify({ choices: [{ delta: { content: '被截斷的' }, finish_reason: null }] })}\n\n`,
      ].join('');
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: truncatedBody,
      });
    });

    await uploadSampleNovel(page, 'truncated-sse');
    await openPhase(page, 'Phase I: Analysis');
    await page.getByRole('button', { name: /Start Analysis/i }).click();

    await expect(page.getByRole('button', { name: /Regenerate|Start Analysis/i })).toBeEnabled({ timeout: 20000 });
    await expect(page.getByRole('link', { name: /Open settings/i })).toBeVisible();
  });

  test('handles malformed JSON in SSE without crash', async ({ page }) => {
    await page.route('**/api/nim/generate', async (route) => {
      const splitAt = Math.floor(ANALYSIS_CONTRACT_VALID_TEXT.length / 2);
      const firstChunk = ANALYSIS_CONTRACT_VALID_TEXT.slice(0, splitAt);
      const secondChunk = ANALYSIS_CONTRACT_VALID_TEXT.slice(splitAt);
      const body = [
        `data: ${JSON.stringify({ choices: [{ delta: { content: firstChunk }, finish_reason: null }] })}\n\n`,
        'data: {BROKEN_JSON_HERE\n\n',
        `data: ${JSON.stringify({ choices: [{ delta: { content: secondChunk }, finish_reason: 'stop' }] })}\n\n`,
        'data: [DONE]\n\n',
      ].join('');
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body,
      });
    });

    await uploadSampleNovel(page, 'malformed-json');
    await openPhase(page, 'Phase I: Analysis');
    await page.getByRole('button', { name: /Start Analysis/i }).click();

    await expect(page.getByRole('button', { name: /Generate 2A\+2B|Regenerate 2A\+2B|Generate Outline/i })).toBeVisible({
      timeout: 30000,
    });
  });

  test('shows progress feedback during slow API response', async ({ page }) => {
    await page.route('**/api/nim/generate', async (route) => {
      await sleep(5000);
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: ssePayloadFromText(ANALYSIS_CONTRACT_VALID_TEXT),
      });
    });

    await uploadSampleNovel(page, 'slow-ttft');
    await openPhase(page, 'Phase I: Analysis');
    await page.getByRole('button', { name: /Start Analysis/i }).click();

    await expect(page.getByText(/正在讀取原文與壓縮成果|Estimating Context Window/i)).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole('button', { name: /Generate 2A\+2B|Regenerate 2A\+2B|Generate Outline/i })).toBeVisible({
      timeout: 30000,
    });
  });

  test('handles API auth failure and recovers interaction state', async ({ page }) => {
    await page.route('**/api/nim/generate', async (route) => {
      await route.fulfill({
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    await uploadSampleNovel(page, '401');
    await openPhase(page, 'Phase I: Analysis');
    await page.getByRole('button', { name: /Start Analysis/i }).click();

    await expect(page.getByText(/ERROR: Invalid API key/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Regenerate|Start Analysis/i })).toBeEnabled();
  });

  test('handles gateway timeout with clear error state', async ({ page }) => {
    await page.route('**/api/nim/generate', async (route) => {
      await route.fulfill({
        status: 504,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Gateway Timeout' }),
      });
    });

    await uploadSampleNovel(page, '504');
    await openPhase(page, 'Phase I: Analysis');
    await page.getByRole('button', { name: /Start Analysis/i }).click();

    await expect(page.getByText(/ERROR: NIM API Error \(504\)/i)).toBeVisible({ timeout: 10000 });
  });

  test('mobile viewport keeps key controls reachable with 44px targets', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();
    await uploadSampleNovel(page, 'mobile');

    const newButton = page.getByRole('button', { name: '新建創作' });
    const settingsButton = page.getByRole('link', { name: /Open settings/i });
    await expect(newButton).toBeVisible();
    await expect(settingsButton).toBeVisible();

    const newButtonBox = await newButton.boundingBox();
    const settingsButtonBox = await settingsButton.boundingBox();
    expect(newButtonBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(settingsButtonBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await context.close();
  });
});
