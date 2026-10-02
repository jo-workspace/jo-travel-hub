# 班機資訊獨立管理與行程頁面整合實作計畫

## 1. 需求理解與摘要 (Requirement Summary)

- **現狀與痛點**：
  - 目前使用者將班機資訊（班號、時間、訂位代號、行李額度）混寫在「旅程設定 ➔ 備註 (tripNote)」中。
  - 缺乏結構化，文字瑣碎且難以一眼掌握重要狀態。
  - 出發前最焦慮的「是否已自動報到」、「是否已完成選位」、「兩人各自可帶幾件/幾公斤行李」沒有清晰的檢視清單。
- **核心目標**：
  1. 建立獨立結構化的班機資料模型 (`FlightInfo`)。
  2. 在行程頁面 (`ItineraryTab`) 自動呈現具質感的航班資訊卡片（機票票根風格 Boarding Pass Style）。
  3. 清晰展示與管理：**自動報到狀態**、**選位狀態/座位號**、**行李件數與公斤數**、**訂位代號 (PNR) 一鍵複製**。

---

## 2. 客觀建議與 UI/UX 設計 (Objective Advice & UX Design)

1. **行程頁面呈現方式 (Itinerary Display)**：
   - 位於行程頁面頂部（在天氣與備註橫幅之間/旁邊），呈現精緻俐落的「航班資訊膠囊/卡片」。
   - **圖示優先、極簡美觀**：
     - 機票核心：`✈️ 去程` / `🛬 回程`、航空公司與班號（例：`星宇 JX800`）、`TPE 08:30 ➔ NRT 12:45`。
     - 訂位代號：`PNR: ABC123` 附一鍵複製圖示 📋。
     - 報到狀態：`✓ 已報到` / `🤖 自動報到` / `⏳ 待報到`。
     - 選位狀態：`💺 24A, 24B` / `⚠️ 未選位`。
     - 行李額度：`🧳 2件×23kg`、`手提 7kg`。
   - 支援展開與收合（Collapse/Expand），預設精簡顯示，點擊展開航廈 Gate、航程時間與電子機票連結。
2. **編輯入口 (Entry Points)**：
   - 入口 A：行程頁面的航班卡片右上角直覺提供「✎ 編輯」按鈕；若未填寫時顯示「＋ 填寫班機資訊」按鈕。
   - 入口 B：旅程設定彈窗 (`SettingsModal`) 中整合「班機資訊」快捷入口，方便行前總覽。
3. **班機編輯彈窗 (`FlightModal`)**：
   - 遵守「點擊空白處關閉」規範。
   - 直覺切換「去程」與「回程」（以及可選轉機/內陸航班）。
   - 提供行李額度快捷標籤（`23kg × 2`、`20kg × 1`、`無託運`），報到與選位提供單選/切換鈕，填寫極致順暢。

---

## 3. 資料架構與持久化 (Data Architecture)

### 3.1 班機資料結構 (`FlightItem` & `FlightInfo`)
```typescript
export interface FlightItem {
  id: string;
  type: 'outbound' | 'inbound' | 'transit'; // 去程 / 回程 / 內陸或轉機
  airline: string;          // 航空公司 (如：長榮航空, 星宇航空)
  flightNumber: string;     // 班機號碼 (如：BR12, JX800)
  departureAirport: string; // 出發機場代碼 (如：TPE, LAX, OKA)
  departureCity?: string;   // 出發城市 (如：台北桃園)
  departureTime: string;    // 出發時間 (YYYY-MM-DD HH:mm 或 HH:mm)
  arrivalAirport: string;   // 抵達機場代碼 (如：LAX, NRT)
  arrivalCity?: string;     // 抵達城市 (如：洛杉磯)
  arrivalTime: string;      // 抵達時間 (YYYY-MM-DD HH:mm 或 HH:mm)
  terminal?: string;        // 航廈 (如：T2)
  gate?: string;            // 登機門 (如：B4)
  pnr?: string;             // 訂位代號 / 電腦代號 (Booking Reference)
  
  // 核心檢查清單欄位
  checkInStatus: 'none' | 'auto' | 'done'; // 待報到 / 已設自動報到 / 已完成報到
  seatStatus: 'unselected' | 'selected';   // 未選位 / 已選位
  seatNumbers?: string;     // 座位號 (如：Jo: 24A, Will: 24B)
  checkedBaggage?: string;  // 託運行李 (如：每人 2 件 (23kg))
  carryOnBaggage?: string;  // 手提行李 (如：每人 1 件 (7kg))
  ticketUrl?: string;       // 電子機票/行程單/航空公司官網連結
  note?: string;            // 備註
}
```

### 3.2 雙軌資料持久化 (Dual-Track Persistence)
- **軌道 A（主軌/零相容成本）**：透過 `trip_settings.trip_note` 隱藏標籤 `<!--FLIGHTS_START-->...<!--FLIGHTS_END-->` + `localStorage` 快取，無縫跨裝置同步。
- **軌道 B（擴充軌）**：提供 `supabase/migrations/202610020002_create_flights_table.sql`，並於 `supabase-client.ts` 支援讀寫自動升級/降級。

---

## 4. 實作步驟 (Implementation Steps)

1. **型別定義** (`src/types/trip.ts`)
   - 增加 `FlightItem` 介面，在 `AllTripData` 增加 `flights?: FlightItem[]`。
2. **後端資料讀寫與同步** (`src/lib/supabase-client.ts`)
   - `getAllData` 解析 `flights`。
   - 新增 `saveFlightData`、`deleteFlightData` 函數，並維護 `trip_note` 標籤與 localStorage。
3. **班機卡片元件** (`src/components/FlightCard.tsx`)
   - 機票票根 (Boarding Pass) 質感卡片。
   - 顯示航段、起降機場與時間、PNR 一鍵複製。
   - 清楚呈現「自動報到標籤」、「選位狀態」、「行李件數」。
   - 支援折疊與展開。
4. **行程分頁整合** (`src/components/tabs/ItineraryTab.tsx`)
   - 於行程頂部渲染 `FlightCard`，並提供編輯按鈕。
5. **班機編輯彈窗** (`src/components/modals/FlightModal.tsx`)
   - 遵守「點擊空白處關閉」規範。
   - 去程 / 回程切換標籤、快捷行李額度、報到與選位狀態切換。
6. **設定彈窗整合** (`src/components/modals/SettingsModal.tsx`)
   - 增加班機資訊入口按鈕，方便隨時設定。
7. **主旅程頁面串接** (`src/app/trip/[id]/page.tsx`)
   - 狀態傳遞與 Modal 開啟閉合控制。
8. **SQL 遷移腳本與驗證** (`npm run build` & Git push)。
