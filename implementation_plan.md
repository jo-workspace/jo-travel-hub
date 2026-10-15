# 代辦清單排版與升冪排序優化實作計畫

## 1. 需求理解與摘要 (Requirement Summary)
- **問題回饋**：
  1. 代辦清單未按照截止日期正確升冪排序（原因：日期格式未標準化導致 Date 解析為 NaN、字串 localeCompare 錯位）。
  2. 原本的「稍後」分類很不直觀，認知負擔大。
- **命名定案 (遵循極致簡潔與使用者指定)**：
  - `🔥 7 天內截止` ➔ 精煉縮短為 **`🔥 7 天內`**。
  - `🗓️ 稍後` ➔ 依使用者指定改為 **`🗓️ 更久之後`**（白話直觀，讓遠期事項如租車安心停放，消除即時焦慮）。
  - `📌 靈活清單` ➔ 不直覺，改回極簡直觀的 **`📌 無期限`**。
  - 完整五大清爽分組：
    1. `🚨 已逾期`
    2. `🔥 7 天內`
    3. `🗓️ 更久之後`
    4. `📌 無期限`
    5. `✓ 已完成`
- **排序修正 (100% 升冪)**：
  - 引入 `normalizeDateToYMD` 與 `parseYMD`，將任何格式的日期（包含斜線、單位數月份等）正規化。
  - 排序全面採用標準時間戳毫秒數相減比較 `(dueA - dueB)`，徹底杜絕亂序與 NaN 問題。

---

## 2. 實作步驟 (Implementation Steps)
### 步驟 1：修改 `src/components/tabs/TodoTab.tsx`
- 引入 `normalizeDateToYMD`, `parseYMD`。
- 重構 `getDueDateBadge` 函數，使用標準化日期計算與顯示。
- 重構 `groups` 邏輯：
  - 精準計算 `diffDays`（依據 UTC 毫秒差除以 86400000）。
  - 依數值精確分派到 `overdue`、`upcoming`（7 天內）、`later`（更久之後）、`nodate`（無期限）、`completed`。
  - 各組內部嚴格採用毫秒數升冪排序。
  - 標題定案為：`🚨 已逾期`、`🔥 7 天內`、`🗓️ 更久之後`、`📌 無期限`、`✓ 已完成`。

### 步驟 2：建置驗證 (Verification)
- 執行 `npm run build` 確認 TypeScript 與 Turbopack 編譯 0 錯誤。

### 步驟 3：Git 自動版本控制 (Git Commit & Push)
- 執行 `git add`、`git commit` 以及 `git push origin main`。
