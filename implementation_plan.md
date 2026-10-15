# 待辦清單「更久之後」柔和沉降樣式與連結標籤化實作計畫

## 1. 需求理解與摘要 (Requirement Summary)
- **視覺降載 (方案 1 - Muted Soft Card)**：
  - 「🗓️ 更久之後」的項目改採「柔和微灰沉降樣式」（`bg-slate-50/80 border-slate-200/70 shadow-none`，標題使用 `font-bold text-slate-700`），避免強烈反灰與「已完成」混淆，但在視覺層次上自然退居次要，讓旅人心理無緊迫感。
  - 對比「🔥 7 天內」與「🚨 已逾期」維持鮮明純白亮卡（`bg-white shadow-2xs` 搭配 `font-extrabold text-slate-900`），焦點分明。
- **連結體驗優化 (Link Tagging & Dedicated Inputs)**：
  1. **前端自動縮成標籤**：待辦項目中的網址不再顯示又長又醜的完整 URL，而是自動提煉為精緻的膠囊標籤（顯示網域名稱，如 `toyotarentacar.com`、`klook.com`，搭配外連圖示），點擊獨立另開分頁。
  2. **編輯彈窗提供 1-2 個獨立連結欄位**：
     - 在 `TodoModal` 中增加「🔗 連結 1 (選填)」與「🔗 連結 2 (選填)」獨立輸入格。
     - 編輯時自動從備註中抽出網址放入連結格，備註 textarea 只保留純文字，編輯時絕不被長連結佔滿空間。
     - 儲存時將純備註與連結合併儲存，零資料庫遷移風險，100% 向下相容。

---

## 2. 實作步驟 (Implementation Steps)

### 步驟 1：修改 `src/components/modals/TodoModal.tsx`
- 引入 `link1` 與 `link2` state。
- 在 `useEffect` 載入項目時，自動用 Regex 抽取 note 中的網址並填入 `link1`, `link2`，note textarea 只呈現純文字。
- 在表單中加入「相關連結」區塊（提供 2 個乾淨 URL 輸入框）。
- 提交時自動組合純文字與網址儲存。

### 步驟 2：修改 `src/components/tabs/TodoTab.tsx`
- 實作 `parseNoteAndLinks` 工具函數，自動分離備註純文字與網址清單。
- 網址呈現為簡短的膠囊標籤（Domain Pill Tag），點擊 `e.stopPropagation()` 獨立開啟外部連結。
- 為 `group.key === 'later'` 套用柔和沉降樣式（微灰底、微調字重、淡化陰影）。

### 步驟 3：驗證與建置 (Verification)
- 執行 `npm run build` 確認 TypeScript 與 Turbopack 0 錯誤。
- 確認 Desktop 與 iPhone 響應式與防誤觸。

### 步驟 4：Git 自動提交與推送 (Git Commit & Push)
- 遵循規範執行 `git add`、`git commit` 以及 `git push origin main`。
