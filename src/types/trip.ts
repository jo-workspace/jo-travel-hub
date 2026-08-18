export interface ItineraryItem {
  rowIndex: number;
  day: string;
  date?: string;
  time?: string;
  type: string;
  title: string;
  content?: string;
  links?: string;
  isVisited: boolean;
}

export interface TodoItem {
  rowIndex: number;
  category: string;
  task: string;
  note?: string;
  isDone: boolean;
}

export interface PackingItem {
  rowIndex: number;
  category: string;
  person: string;
  item: string;
  note?: string;
  location?: string;
  isPacked: boolean;
}

export interface ExpenseItem {
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
  rowIndex: number;
  store: string;
  forWhom: string;
  item: string;
  quantity?: string;
  price?: number;
  purchaseStatus?: 'pending' | 'purchased' | 'out_of_stock';
  image?: string;
  url?: string;
  note?: string;
  isDone: boolean;
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
  foreignCurrency?: string; // 外幣代碼，例如 USD / JPY / EUR
  companions?: string;    // 同行人員，例如 Jo, Will, 特特
  timezone?: string;      // 旅程目的地時區（IANA），例如 America/Los_Angeles
  customIcon?: string;    // 前台上傳與壓縮之 180x180 PNG Data URI 圖示
  svgIcon?: string;       // 相容舊版欄位
}
