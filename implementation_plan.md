# 待辦清單「呼吸感 Lay back」與「更久之後緊湊淡化」實作計畫 (方案 B + C)

## 1. 需求理解與摘要 (Requirement Summary)
- **核心目標**：進一步淡化「🗓️ 更久之後」的存在感，同時放大「Lay back & chill」區塊的鬆弛感，並確保系統整體的視覺一致性。
- **方案選擇 (B + C)**：
  - **方案 B（擴大 Lay back 區塊的呼吸感）**：
    - 不生硬放大字體，而是擴大垂直留白（`py-7 px-5`，圓角升級至 `rounded-3xl`）。
    - 🌴 圖示微升為 `text-2xl` 視覺焦點，文案細膩舒展（`text-xs sm:text-sm font-bold text-emerald-800/90`），營造沉靜溫暖的行前鬆弛感。
  - **方案 C（更久之後卡片緊湊輕量化 Compact Flat Styling）**：
    - **文字大小不縮小**：維持標準 `text-base`（16px），徹底杜絕字級斷裂與易讀性下降的隱患。
    - **視覺重量減半**：
      - 容器改採極簡輕量排版（`py-2.5 sm:py-3 px-3.5`，內距緊湊化）。
      - 背景與邊框採用極淡微灰（`bg-slate-50/60 border-slate-200/50 shadow-none hover:bg-slate-100/50`）。
      - 標題字重由 `font-extrabold` 微調為平靜的 `font-medium text-slate-700`，備註維持 `text-slate-400`。
    - 整體排列宛如安靜從容的附錄清單，既清晰隨時可查，又絕不產生急迫焦慮。

---

## 2. 實作步驟 (Implementation Steps)

### 步驟 1：修改 `src/components/tabs/TodoTab.tsx`
- 重構「🌴 近期無須操心，放輕鬆 Lay back & chill ✨」卡片樣式（方案 B）。
- 在卡片渲染邏輯中，針對 `isLater` 套用專屬的緊湊輕量化排版（方案 C）。

### 步驟 2：建置驗證 (Verification)
- 執行 `npm run build` 確認編譯通過。

### 步驟 3：Git 自動版本控制 (Git Commit & Push)
- 遵循規範自動執行 `git add`、`git commit` 以及 `git push origin main`。
