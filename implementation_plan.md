# 行程頁面已確定住宿呈現與點擊行為優化實作計畫 (方案 A)

## 1. 需求理解與摘要 (Requirement Summary)
- **優化目標**：優化行程頁面（`ItineraryTab`）中「已確定住宿（Confirmed Accommodation）」在桌機與 iPhone 端的呈現方式與點擊行為。
- **核心設計定調 (方案 A)**：
  1. **外層直接整合導航按鈕 (統一一般行程行為)**：在住宿卡片外層飯店名稱旁放置 Google Maps 導航圖示（`<MapPin className="text-sky-600" />`），點擊獨立另開 Google 地圖，實現與其他行程項目 100% 一致的心智模型。
  2. **智慧地圖連結 (Smart Fallback)**：若住宿未自訂 `mapUrl`，自動合成 Google Maps 搜尋連結 (`https://www.google.com/maps/search/?api=1&query=...`)，確保旅人一鍵導航必定成功。
  3. **去蕪存菁 (Minimalist)**：不放置多餘的「一鍵複製訂單號」按鈕，保持介面極致清爽。
  4. **點擊行為統一 (Click Behavior)**：卡片本體點擊，或點擊右側的 `<Edit3 className="w-4 h-4 text-slate-400" />` 編輯圖示，直接開啟住宿編輯視窗（`AccommodationModal`）；點擊 `MapPin` 則透過 `e.stopPropagation()` 獨立開啟地圖。
  5. **精緻微卡片呈現 (Card Presentation)**：
     - 左側：`<BedDouble />` 雅緻圖示 ＋ 飯店名稱（加粗） ＋ 微型標籤（首晚顯示 `Check-in`，連住顯示 `連住`） ＋ 導航圖示 📍。
     - 次要行：地區與房型（`cityArea · roomType`），次要層級不喧賓奪主。若有備註（`note`），以單行截斷輕量提示。
     - 右側：編輯圖示按鈕 `<Edit3 />`。
     - 規格遵循：iOS 觸控熱區、邊框防溢出、極簡設計規範。

---

## 2. 實作步驟 (Implementation Steps)

### 步驟 1：修改 `src/components/tabs/ItineraryTab.tsx`
- 調整「每天結尾：極簡住宿錨點」區塊中 `if (confirmedAcc)` 的渲染邏輯。
- 計算：
  - `isCheckInDay`：判斷當前日期是否等於 `confirmedAcc.checkInDate`。
  - `mapUrl`：優先取 `confirmedAcc.mapUrl`，若無則 fallback 生成 Google Maps 搜尋 URL。
  - `subInfo`：結合 `confirmedAcc.cityArea` 與 `confirmedAcc.roomType`。
- 樣式重構：
  - 將原本的扁平小按鈕替換為結構清晰、層次明確的精緻微卡片。
  - 外層容器加上 `onClick={() => onOpenAccommodationModal(confirmedAcc)}`。
  - 導航連結加上 `onClick={(e) => e.stopPropagation()}`。
  - 右側編輯按鈕加上 `onClick={(e) => { e.stopPropagation(); onOpenAccommodationModal(confirmedAcc); }}`。

### 步驟 2：驗證與檢查 (Verification)
- 執行專案 Build / TypeScript 檢查，確認無型別或語法錯誤。
- 確認響應式效果（Desktop 滑鼠 Hover 與 iPhone 觸控）。

### 步驟 3：Git 自動版本控制 (Git Commit & Push)
- 遵循規範自動執行 `git add .`、`git commit -m "..."` 與 `git push origin main`。
