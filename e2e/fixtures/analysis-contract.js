export const ANALYSIS_CONTRACT_VALID_TEXT = [
  '【角色動機地圖】',
  '- 角色 A：目標、底線、觸發點。',
  '【權力與張力機制】',
  '- 關係拉鋸與反制節點。',
  '【文風錨點（可執行規則）】',
  '- 採第三人稱、短句推進。',
  '【事件與伏筆 ledger】',
  '- 伏筆 1 未回收。',
  '【續寫升級建議（穩定 + 大膽）】',
  '- 下一章先推主線再拉高衝突。',
  '【禁止清單（避免重複與失真）】',
  '- 避免重複場景與人設漂移。',
].join('\n');

export function ssePayloadFromText(text) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;
}
