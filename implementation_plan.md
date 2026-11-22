# 時區智慧解析與海外氣象判定優化實作計畫

## 1. 任務背景與目標
1. **時區輸入體驗極致簡化**：
   - 捨棄死板繁瑣的下拉選單，維持清爽自由的文字輸入框。
   - 支援任意常見輸入形式：
     - 時區縮寫：`JST`、`KST`、`PST`、`PDT`、`EST`、`UTC`...
     - 時差數字：`+9`、`-7`、`GMT+9`、`UTC-8`...
     - 旅遊地名：`日本`、`東京`、`沖繩`、`宮古島`、`首爾`、`曼谷`、`洛杉磯`...
     - 標準代碼相容：`Asia/Tokyo`、`America/Los_Angeles`...
   - **即時回饋（Live Feedback）**：輸入當下即時在輸入框下方顯示解析結果與當地目前時間（例如：`✓ 日本時間 (GMT+9) · 當地 12:21`），消除黑盒子不確定感。
   - 底層自動標準化為符合瀏覽器規範的 IANA 時區代碼，確保系統各處運作 100% 穩定。

2. **修正海外地點（如宮古島）被誤判為台灣氣象之問題**：
   - 修正 `weather.ts` 中「只要行程標記為台灣，即使 Geocoding 明確回傳國外（`country_code !== 'TW'`）仍強制將國家換成台灣、來源強指 CWA」的邏輯。
   - 修正 `SettingsModal.tsx` 中「僅因時區為台北就自動預設勾選台灣」之不合理連動。

---

## 2. 預計修改與新增檔案

### [新增] `src/lib/timezone.ts`
- 封裝純前端規則與正則解析器：
  - `resolveTimezone(input?: string): TimezoneResolution`
  - 支援：
    1. 常用縮寫映射 (`JST`, `KST`, `PST`, `PDT`, `EST`, `EDT`, `CET`, `BST` 等)
    2. 數字時差正規表達式 (`+9`, `-7`, `GMT+9`, `UTC-8` 等)
    3. 常用旅遊城市/國家別名 (`日本`, `東京`, `沖繩`, `曼谷`, `首爾`, `洛杉磯` 等)
    4. 原生合法 IANA 代碼直接驗證
  - 即時計算並回傳：
    - `iana`: 標準 IANA 字串（供系統儲存與計算）
    - `displayText`: 使用者好懂的名稱（如 `日本時間 (GMT+9)`）
    - `localTime`: 當地目前時間（如 `12:21`）
    - `isValid`: 是否成功辨識

### [修改] `src/components/modals/SettingsModal.tsx`
- 時區輸入欄位加入智慧解析與即時反饋：
  - placeholder 調整為：`例：JST、GMT+9、+9 或日本`
  - 輸入框下方新增即時反饋文字（綠色成功標籤 / 灰色提示 / 紅色未辨識提示）
  - 儲存時將正規化後的 `iana` 代碼存入設定中。
- 取消 `defaultTaiwan` 單純以 `timezone.includes('Taipei')` 作為預設勾選台灣的邏輯，避免郵輪或出發地在台灣的海外行程被誤勾。

### [修改] `src/lib/weather.ts`
- 在 `resolveCityInfo()` 中：
  - 即使 `isTaiwanTrip` 為 true，若 Geocoding 結果的 `country_code` 非 `TW`（例如宮古島回傳 `JP`），**維持實際國名（日本）**，且 `source` 設定為 `Open-Meteo`。
  - 將 `KNOWN_COORDINATES`（海外城市字典）的判斷獨立，不再被 `if (!isTaiwanTrip)` 整體阻擋。

---

## 3. 驗證步驟
1. 執行 build / lint 確保 TypeScript 編譯零錯誤。
2. 測試時區解析器：
   - 輸入 `JST`、`+9`、`GMT+9`、`日本`，確認皆能即時解析為 `日本時間 (GMT+9)` 並帶出當地正確時間。
   - 輸入 `+8`、`台灣`，確認解析為 `台灣時間 (GMT+8)`。
   - 輸入任意時差（如 `+2`），確認能精確對應。
3. 測試宮古島天氣解析：
   - 驗證宮古島地點不會再顯示「台灣」，而是正確顯示「日本 · Miyakojima Shi · 宮古島市」，資料來源為「Open-Meteo 全球預報」，外部連結不導向台灣氣象署。
4. 驗證完成後依規則自動執行 `git add`、`git commit` 與 `git push`。
