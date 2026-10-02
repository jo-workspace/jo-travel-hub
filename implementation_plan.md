# 住宿管理與預訂比價中心 (Accommodation Hub) 實作計畫

## 1. 需求理解與摘要 (Requirement Summary)

- **核心使用情境**：
  - 在旅程籌備期，使用者與旅伴習慣在不同平台（Agoda, Booking.com, Airbnb, 飯店官網等）預訂多間**支援免費取消**的房間先卡位。
  - 訂單由不同旅伴（如 Jo, Will）分別刷卡預訂，分散在不同帳號與電子郵件。
  - 後續行程確定後，需要集中比價與挑選，將最合適的一間標記為**保留**，並在**免費取消截止日前**及時將其餘房間退訂，避免逾期扣款。
- **核心痛點**：
  - 各平台訂單分散、訂房者不同，容易混淆。
  - 最致命的是忘記取消截止日導致扣款。
  - 缺乏同一日期區間各家房型的橫向比較檢視。

---

## 2. 客觀建議與產品設計 (Objective Advice & Design)

1. **獨立一級分頁「住宿」 (Accommodations)**
   - 於桌機側邊欄 (Sidebar) 與手機底導覽 (MobileNav) 新增 `住宿` 分頁（圖示優先：`BedDouble` 或 `Building2`）。
   - 與「行程」、「待辦」、「打包」、「記帳」、「購物」並列，不污染每日行程表，保持畫面專注乾淨。
2. **多視角篩選與同日期比價檢視**
   - **時段分組檢視**：按「入住日期/城市」自動分組，一眼看出「同一晚有哪些飯店在 PK 比較」。
   - **狀態快捷切換**：
     - `抉擇中` (Pending/Candidate)：正在比較的候補房間。
     - `已保留` (Confirmed)：已決定入住的最終選擇。
     - `已取消` (Cancelled)：已在平台完成退訂的歷史紀錄。
3. **免費取消截止高亮提醒 (Cancellation Alert)**
   - 距離截止日 $\le 3$ 天：黃色/琥珀色警示標籤「3 天後截止」。
   - 當天或已過截止日：紅色警示「今日截止」或「已過取消期」。
   - 支援顯示取消截止之確切日期與時間（如 2026/08/10 23:59）。
4. **一鍵決策流 (Quick Decision Workflow)**
   - 當決定選擇某間時，點擊「✓ 保留此間」，狀態轉為「已保留」；
   - 系統友善提示：「同梯其他候補房間是否標記為待退訂？」，簡化決策心智負擔。
5. **精簡與直覺的彈窗編輯 (AccommodationModal)**
   - 支援點擊背景關閉（遵守彈窗規範）。
   - 預訂平台支援常見快捷膠囊（Agoda, Booking.com, Airbnb, Trip.com, 官網...）與自訂輸入。
   - 訂房者自動帶入旅程成員（如 Jo, Will）。
   - 費用自動連動外幣/台幣匯率試算。
   - 訂單編號、訂單連結、Google 地圖導航連結、備註等完整收納。

---

## 3. 資料架構與雙軌相容性設計 (Data Architecture)

### 3.1 房型資料結構 (`AccommodationItem`)
```typescript
export interface AccommodationItem {
  id: string;
  tripId: string;
  name: string;               // 飯店/住宿名稱
  cityArea?: string;          // 城市/地區（如：那霸國際通、名護海濱、LA Downtown）
  checkInDate: string;        // 入住日期 YYYY-MM-DD
  checkOutDate: string;       // 退房日期 YYYY-MM-DD
  platform: string;           // 預訂平台（Agoda, Booking.com, Airbnb, 官網...）
  booker: string;             // 訂房者（Jo, Will...）
  price?: number;             // 金額
  currency?: string;          // 幣別（JPY, USD, TWD...）
  roomType?: string;          // 房型說明（如：海景雙人房、雙床含早）
  freeCancellationDate?: string; // 免費取消截止日期時間 (YYYY-MM-DD HH:mm)
  status: 'candidate' | 'confirmed' | 'cancelled'; // 狀態：抉擇中 / 已保留 / 已取消
  bookingRef?: string;        // 訂單編號 / 確認號
  bookingUrl?: string;        // 平台訂單連結
  mapUrl?: string;            // Google Maps 連結
  note?: string;              // 備註（停車費、入住說明等）
  createdAt?: number;
}
```

### 3.2 雙軌資料持久化 (Dual-Track Persistence)
- **軌道 A（主軌/零設定相容）**：比照 `coupons` 與 `city_schedule` 機制，透過 `trip_settings.trip_note` 內的隱藏標籤 `<!--ACCOMMODATIONS_START-->...<!--ACCOMMODATIONS_END-->` 進行 Base64/JSON 儲存，並同步更新客戶端 `localStorage`。**無需立即變更遠端 Supabase 結構，直接就能 100% 穩定使用與跨裝置同步！**
- **軌道 B（擴充軌/資料庫資料表）**：提供 `supabase/migrations/202610020001_create_accommodations_table.sql`，並於 `supabase-client.ts` 實現相容偵測，若資料表存在則優先寫入資料表，不存在時優雅降級至軌道 A。

---

## 4. 實作計畫步驟 (Implementation Steps)

1. **型別定義與輔助工具** (`src/types/trip.ts`)
   - 增加 `AccommodationItem` 介面及在 `AllTripData` 中增加 `accommodations: AccommodationItem[]`。
2. **後端資料讀寫與同步邏輯** (`src/lib/supabase-client.ts`)
   - 在 `getAllData` 增加 accommodations 解析。
   - 新增 `saveAccommodationData`、`deleteAccommodationData`、`updateAccommodationStatus` 等操作函式。
3. **住宿分頁元件** (`src/components/tabs/AccommodationsTab.tsx`)
   - 頂部摘要列：候補中房數、已保留房數、即將到期提醒。
   - 分組切換：按「入住時段對比」或「全部清單」。
   - 房型卡片：顯示飯店名稱、平台徽章、訂房者標籤、價格、取消截止倒數、快捷按鈕（保留/退訂/編輯/刪除/地圖/訂單）。
4. **住宿新增與編輯彈窗** (`src/components/modals/AccommodationModal.tsx`)
   - 遵守「點擊空白處關閉」規範。
   - 圖示優先、極簡好填：入住退房日期選擇、取消截止日與倒數預覽、平台與訂房者快捷選擇按鈕。
5. **整合進主旅程頁面與導覽列** (`src/app/trip/[id]/page.tsx`, `Sidebar.tsx`, `MobileNav.tsx`)
   - 增加 `accommodations` 分頁項目與導航。
   - 支援 URL 參數 `?tab=accommodations`。
6. **SQL 遷移腳本準備** (`supabase/migrations/202610020001_create_accommodations_table.sql`)
7. **驗證與建置測試** (`npm run build`)
   - 確保 TypeScript 型別無誤、Next.js 編譯通過。
8. **Git 自動提交與推送** (遵照 Git 規範)。
