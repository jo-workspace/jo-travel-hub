# 旅伴專屬分享連結（僅行程唯讀 ＋ 記帳協作）實作計畫

## 需求理解與摘要
為 **Will 以外的同行旅伴** 提供專屬免密碼分享連結，達成以下目標：
1. **免輸入管理密碼**：旅伴點擊帶有簽章 Token 的專屬網址（`/share/[id]?token=...`）即可直接進入該趟旅程，無須得知站台主密碼 `APP_PASSWORD`。
2. **嚴格分頁隔離（僅顯示「行程」與「記帳」）**：
   - 導覽列只保留 **行程** 與 **記帳** 兩個分頁，完全不載入住宿、待辦、打包、購物等私人分頁。
   - 頂部移除「返回旅程大廳」、「切換生活空間 (`HubSpaceSwitcherModal`)」與「旅程設定 (`SettingsModal`)」，防止跳轉至其他私人旅程或修改設定。
3. **權限控管（行程唯讀、記帳可新增/編輯）**：
   - **行程分頁 (`ItineraryTab`)**：完全唯讀（可切換天數、切換清單/地圖、查看天氣、查看航班與已確認住宿並點擊 Google Maps 導航、點擊重要備註外部連結，但隱藏所有新增、編輯、打卡勾選、口袋名單排程與拖曳調整時間功能）。
   - **記帳分頁 (`ExpensesTab`)**：開放旅伴查看分帳結算與新增/編輯費用（支援同行成員付款與分攤）。

---

## 安全架構設計
1. **HMAC 綁定旅程簽章 Token (`src/lib/auth.ts`)**
   - 新增 `createCompanionShareToken(tripId)` 與 `verifyCompanionShareToken(tripId, token)`：
   - Token 格式為 `${tripId}.${expiresAt}.${signature}`，以伺服器端 `APP_PASSWORD` 進行 `HMAC-SHA256` 簽章（預設效期 180 天，並以 `crypto.timingSafeEqual` 比對簽章）。
   - 因 Token 內綁定 `tripId`，持有 `la-2026` 分享連結的旅伴**無法**將網址改為其他 `tripId` 存取別趟旅程。
2. **Middleware / Proxy 驗證放行與 Cookie 續航 (`src/proxy.ts`)**
   - 當請求路徑為 `/share/[tripId]` 時，檢查網址 `?token=...` 或 Cookie `hub_share_[tripId]` 是否通過 `verifyCompanionShareToken(tripId, token)`。
   - 驗證通過即放行並寫入 `hub_share_[tripId]` Cookie，讓旅伴即使將網頁「加入 iOS 主畫面」或重新整理也不會掉線；驗證失敗則導回 `/login`。
3. **後台專屬簽發 API (`src/app/api/share-link/route.ts`)**
   - 由於 `APP_PASSWORD` 僅存於伺服器端，透過受管理員驗證保護的 `GET /api/share-link?tripId=[id]` 產生簽章 Token 回傳給前端複製，確保金鑰絕不外洩至前端 Bundle。

---

## 預計新增與修改檔案

1. `src/lib/auth.ts`
   - 新增 `getShareCookieName(tripId: string)`、`createCompanionShareToken(tripId: string)`、`verifyCompanionShareToken(tripId: string, token?: string | null)`。
2. `src/proxy.ts`
   - 針對 `/share/:id` 路徑驗證 URL `?token` 或專屬 Cookie，通過即放行（並自動寫入 Cookie），未通過則導向 `/login`。
3. `src/app/api/share-link/route.ts`（新增）
   - 管理員呼叫時簽發指定 `tripId` 的旅伴分享 Token。
4. `src/components/FlightCard.tsx` & `src/components/tabs/ItineraryTab.tsx`
   - `FlightCard` 的 `onOpenModal` 改為選填；無 `onOpenModal` 時隱藏編輯鉛筆與「＋ 新增去/回程航班」按鈕，保留複製 PNR 與查看機票功能。
   - `ItineraryTab` 新增 `readOnly?: boolean` 屬性：當 `readOnly=true` 時隱藏「＋ 新增行程」、景點編輯/打卡按鈕、口袋名單排程互動、住宿編輯與候選/新增住宿按鈕（僅顯示已確認住宿與地圖導航）。
5. `src/app/share/[id]/page.tsx`（新增）
   - 旅伴專屬極簡頁面：
     - 頂部極簡 Header（僅顯示旅程圖示、名稱、隱藏/顯示已完成切換、重新整理按钮；不含生活空間切換、返回大廳與設定）。
     - 桌面側邊欄與手機底部導覽僅渲染 `行程` 與 `記帳` 兩分頁。
     - `ItineraryTab` 以 `readOnly={true}` 渲染；`ExpensesTab` 與 `ExpenseModal` 正常開放記帳協作。
6. `src/components/Header.tsx` & `src/app/trip/[id]/page.tsx`
   - 點擊 Header 的「分享」按鈕時，提供極簡選單或直接選擇複製「**旅伴分享連結（僅行程＋記帳）**」與「**完整管理連結**」。

---

## 驗證方式
1. 執行 `npx tsc --noEmit` 與 `npm run build` 確認型別與 Next.js 路由建置無誤。
2. 驗證 `/api/share-link` 能正確簽發 Token，且 `verifyCompanionShareToken` 對跨 `tripId` 或偽造簽章均嚴格拒絕。
3. 驗證 `/share/[id]` 僅出現「行程（唯讀）」與「記帳（可新增/編輯）」兩分頁，且無任何跳轉回大廳或開啟設定的入口。
4. 完成驗證後自動執行 `git add`、`git commit` 與 `git push` 推送至 `origin/main`。
