# Session 修改總結 (2026-01-31)

## 📋 修改概覽

本次 session 主要解決了工作流程自動化問題和歷史記錄系統重新設計。

---

## 🔧 主要修改

### 1. 工作流程自動化修復

| 檔案                        | 修改內容                                                                          |
| --------------------------- | --------------------------------------------------------------------------------- |
| `store/useWorkflowStore.ts` | 添加全局 `isGenerating` mutex 鎖，修復 Phase 4→5 自動打開，Phase 5 完成後重置狀態 |
| `hooks/useStepGenerator.ts` | 使用全局鎖替代局部 ref，增強 stop 函數                                            |
| `lib/nim-client.ts`         | SSE 錯誤處理，超時從 60s→180s                                                     |
| `lib/prompt-engine.ts`      | Token 優化：只保留最近 2 章完整內容                                               |

### 2. Session-Based 歷史系統

| 檔案                                          | 修改內容                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `lib/db.ts`                                   | 添加 `sessionId` 欄位，版本 3 schema，新增 getAllSessions/deleteSession 函數 |
| `store/useNovelStore.ts`                      | 添加 session 管理：loadSession, startNewSession, deleteSessionById           |
| `components/workflow/VersionList.tsx`         | 改為類似聊天記錄的 UI，點擊載入 session                                      |
| `components/workflow/HistoryExportDialog.tsx` | 對話框改為橫向布局 (95vw × 70vh)                                             |
| `components/ui/dialog.tsx`                    | 移除 `sm:max-w-lg` 限制                                                      |

### 3. UI 修復

| 檔案                                       | 修改內容                                                    |
| ------------------------------------------ | ----------------------------------------------------------- |
| `app/page.tsx`                             | 添加 useSettingsStore.initialize() 解決模型選擇不持久化問題 |
| `components/workflow/StepContinuation.tsx` | 顯示「繼續寫第 X 章」按鈕文字                               |
| `components/workflow/StepOutline.tsx`      | 添加調試日誌                                                |

---

## ⚠️ 重要注意事項

### Token 限制

- 模型 context 限制：200000 tokens
- 當小說 + 前面章節超過限制時，API 會返回錯誤
- **解決方案**：`prompt-engine.ts` 只保留最近 2 章完整內容，早期章節用 500 字摘要

### Session 系統

- 每次執行 Phase 1 (Analysis) 會創建新 session
- Session 名稱取自小說前 30 字
- 舊數據可能需要手動清除（F12 → Application → IndexedDB → DeleteDatabase）

### 調試日誌

- Console 中會顯示 `[Workflow]`、`[Generator]`、`[SSE]` 前綴的日誌
- 如需清理，搜索並移除 `console.log` 和 `console.warn`

---

## 🐛 已知限制

1. **Stop 按鈕**：需要 AbortController 存在才能停止，如果 API 尚未響應可能無法立即停止
2. **Token 計算**：目前無法在發送前預估 token 數量，只能等 API 返回錯誤
3. **長時間生成**：如果 API 響應超過 180 秒會超時

---

## 📁 相關檔案路徑

```
store/useWorkflowStore.ts    # 工作流程狀態管理
store/useNovelStore.ts       # 小說/Session 狀態管理
hooks/useStepGenerator.ts    # AI 生成邏輯
lib/nim-client.ts            # NIM API 客戶端
lib/prompt-engine.ts         # Prompt 模板注入
lib/db.ts                    # IndexedDB 操作
```
