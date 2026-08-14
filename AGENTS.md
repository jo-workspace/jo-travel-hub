<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 後端與試算表資料庫架構規範 (Google Sheets Backend Guidance)

- 當未來專案有需要擴充、修改後端邏輯，或複製建立新旅遊專案時：
  - **優先採用方案**：使用 **Next.js API Routes (`app/api/...`) + 官方 `@googleapis/sheets` 庫**，搭配 Google Service Account 與環境變數 (`GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`)。
  - **避免維護**：避免新增或重新部署 Google Apps Script (`.gs`) Web App 腳本，以達成零 `.gs` 部署、完全由 Next.js + Vercel 環境變數管理之架構。

## Git 版本控制規範 (Git Workflow Guidance)

- **自動推送**：凡是有修改程式碼並完成任務驗證後，務必自動執行 `git add`、`git commit` 以及 `git push` 將變更推送到遠端 Repository (origin/main)。

## 溝通與協作規範 (Communication & Collaboration Guidance)

- **想法理解與摘要**：當使用者提出想法時，先簡單摘要總結以確認理解無誤。
- **客觀建議**：給予具建設性且客觀的建議（不盲目贊同，也不為質疑而質疑）。
- **實作計畫 (Implementation Plan)**：遇到較大範圍的程式碼修改或架構調整時，執行前先撰寫 `implementation_plan.md` 供使用者審閱確認。

