export interface ItineraryItem {
  id?: string;
  rowIndex: number;
  day: string;
  date?: string;
  time?: string;
  type: string;
  title: string;
  content?: string;
  links?: string;
  isVisited: boolean;
  isIgnored?: boolean;
}

export interface TodoItem {
  id?: string;
  rowIndex: number;
  category: string;
  task: string;
  note?: string;
  isDone: boolean;
}

export interface PackingItem {
  id?: string;
  rowIndex: number;
  category: string;
  person: string;
  item: string;
  note?: string;
  location?: string;
  isPacked: boolean;
}

export interface ExpenseItem {
  id?: string;
  rowIndex: number;
  category: string;
  item: string;
  amount: number;
  currency: 'USD' | 'TWD' | string;
  paidBy: 'Jo' | 'Will' | string;
  split: 'Jo' | 'Will' | 'Both' | string;
  note?: string;
  date?: string;
}

export interface ShoppingItem {
  id?: string;
  rowIndex: number;
  store: string;
  forWhom: string;
  item: string;
  quantity?: string;
  price?: number;
  purchaseStatus?: 'pending' | 'purchased' | 'out_of_stock' | 'ignored';
  image?: string;
  url?: string;
  note?: string;
  isDone: boolean;
  isIgnored?: boolean;
}

export interface AllTripData {
  itinerary: ItineraryItem[];
  todo: TodoItem[];
  packing: PackingItem[];
  expenses: ExpenseItem[];
  shopping: ShoppingItem[];
  fxRate: number;
  tripNote: string;
  startDate?: string;     // YYYY-MM-DD，旅程起始日，用於自動計算每天日期
  budgetTwd?: number;     // 總預算（台幣）
  tripTitle?: string;     // 旅程名稱（from trips table）
  tripDates?: string;     // 旅程日期顯示（from trips table）
  badgeText?: string;     // 旅程狀態（進行中 / 籌備中 / 已封存）
  foreignCurrency?: string; // 外幣代碼，例如 USD / JPY / EUR
  companions?: string;    // 同行人員，例如 Jo, Will, 特特
  timezone?: string;      // 旅程目的地時區（IANA），例如 America/Los_Angeles
  customIcon?: string;    // 前台上傳與壓縮之 180x180 PNG Data URI 圖示
  svgIcon?: string;       // 相容舊版欄位
  citySchedule?: string;  // 跨城市天數排程，例如 Day 1-3: Los Angeles, Day 4-5: Las Vegas
  isTaiwanTrip?: boolean; // 是否為台灣本地行程（啟用 CWA 官方氣象）
  historicalPackingCategories?: string[]; // 跨旅程歷史打包類別
  historicalTodoCategories?: string[];    // 跨旅程歷史待辦分類
  coupons?: CouponItem[]; // 優惠券與票券截圖清單
  accommodations?: AccommodationItem[]; // 住宿預訂與比價清單
  flights?: FlightItem[]; // 班機資訊（去程、回程、報到與行李狀態）
}

export type FlightType = 'outbound' | 'inbound' | 'transit';
export type FlightCheckInStatus = 'none' | 'auto' | 'done'; // 待報到 / 已設自動報到 / 已完成報到

export interface FlightItem {
  id: string;
  type: FlightType;         // 去程 / 回程 / 轉機或內陸
  airline: string;          // 航空公司 (如：星宇航空, 長榮航空)
  flightNumber: string;     // 班機號碼 (如：JX800, BR12)
  departureAirport: string; // 出發機場代碼 (如：TPE, LAX)
  departureCity?: string;   // 出發城市名稱 (如：台北桃園)
  departureDate?: string;   // 出發日期 (YYYY-MM-DD)
  departureTime: string;    // 出發時間 (HH:mm 或 YYYY-MM-DD HH:mm)
  arrivalAirport: string;   // 抵達機場代碼 (如：NRT, LAX)
  arrivalCity?: string;     // 抵達城市名稱 (如：東京成田)
  arrivalDate?: string;     // 抵達日期 (YYYY-MM-DD)
  arrivalTime: string;      // 抵達時間 (HH:mm 或 YYYY-MM-DD HH:mm)
  terminal?: string;        // 航廈 (如：T2)
  gate?: string;            // 登機門 (如：B4)
  pnr?: string;             // 訂位代號 / 電腦代號 (Booking Reference)
  checkInStatus: FlightCheckInStatus; // 報到狀態
  seatStatus?: 'unselected' | 'selected'; // 選位狀態
  seatNumbers?: string;     // 座位號碼 (如：Jo: 24A, Will: 24B)
  checkedBaggage?: string;  // 託運行李額度 (如：2件 (23kg))
  carryOnBaggage?: string;  // 手提行李額度 (如：7kg)
  ticketUrl?: string;       // 電子機票或線上報到網址
  note?: string;            // 備註說明
  isCompleted?: boolean;    // 是否已搭乘完成
  createdAt?: number;
}

export type AccommodationStatus = 'candidate' | 'confirmed' | 'pending_cancel' | 'cancelled';


export interface AccommodationItem {
  id: string;
  tripId: string;
  name: string;
  cityArea?: string;
  checkInDate: string;
  checkOutDate: string;
  platform: string;
  booker: string;
  price?: number;
  currency?: string;
  roomType?: string;
  freeCancellationDeadline?: string;
  status: AccommodationStatus;
  bookingRef?: string;
  bookingUrl?: string;
  mapUrl?: string;
  note?: string;
  createdAt?: number;
}

export interface CouponItem {
  id: string;
  title: string;          // 優惠券名稱，例如：BicCamera 免稅 10% + 7% 折價券
  store?: string;         // 適用店家，例如：BicCamera、唐吉訶德、松本清
  discount?: string;      // 折扣亮點，例如：免稅 10% + 現折 7%
  expiryDate?: string;    // 有效期限，例如：2026/12/31
  imageUrl: string;       // 壓縮後的圖片 Data URL (Base64 WebP) 或外部圖片 URL
  note?: string;          // 使用說明或備註
  createdAt?: number;
}

