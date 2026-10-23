# 住宿雙訂單多房確定與行程呈現實作計畫 (方案 A)

## 1. 需求理解與摘要 (Requirement Summary)
- **核心目標**：解決同一天有兩間房、兩個獨立訂單時「無法同時確定」的限制，並在行程表（Itinerary Tab）當天底部支援多間確認住宿並列顯示。
- **變更重點**：
  1. **解除強制淘汰連動**：在 [AccommodationsTab.tsx](file:///Users/jo/.gemini/antigravity/scratch/jo-travel-hub/src/components/tabs/AccommodationsTab.tsx) 中，點擊「確定」不再自動將同日的其他 candidate 標記為待退訂；使用者可自由將多筆訂單同時設為「已確定」。若需淘汰某間房，使用卡片原有的「✕ 捨棄」按鈕即可。
  2. **行程表多房並列支援**：在 [ItineraryTab.tsx](file:///Users/jo/.gemini/antigravity/scratch/jo-travel-hub/src/components/tabs/ItineraryTab.tsx) 中，由單一 `find()` 改為 `filter()`，當天若有多間確認住宿，以緊湊俐落的堆疊卡片顯示，並完整標註「房型 · 訂購人 · 訂單編號」，現場辦理入住出示清晰明確。

---

## 2. 實作步驟 (Implementation Steps)

### 步驟 1：修改 `src/components/tabs/AccommodationsTab.tsx`
- 修改 `handleConfirmAccommodation`：僅將當前選定項目設為 `confirmed`，不連動修改同日其他候補。
- 修改 `handleUndoConfirmation`：僅將當前項目恢復為 `candidate`。
- 精簡提示文案，維持極致簡潔。

### 步驟 2：修改 `src/components/tabs/ItineraryTab.tsx`
- 將當日已確定住宿搜尋改為 `activeAccs.filter(...)`。
- 當有多筆確認住宿時，以 `space-y-2` 渲染每間房的獨立小卡，資訊包含：
  - 飯店名稱、[Check-in] 或 [連住] 標籤、Google Maps 📍 地圖連結。
  - 次要資訊：區域 · 房型 · 訂購人 · 訂單代號（如有）。
  - 各自獨立的 ✎ 編輯彈窗按鈕。
- 若無確認住宿但有多筆候選時，候選按鈕提示 `X 等 N 間 (抉擇中)`。

### 步驟 3：驗證與測試 (Verification)
- 執行 `npm run build` 確保 TypeScript 型別無錯誤、打包正常。

### 步驟 4：Git 版本控制自動推送 (Git Push)
- 遵循規範自動執行 `git add .`、`git commit -m "..."` 與 `git push origin main`。
