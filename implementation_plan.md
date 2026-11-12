# 待辦分頁 Minimalist UX 優化實作計畫

## 需求理解與摘要
1. **時間排序**：待辦事項依截止日由近到遠嚴格排序（已逾期 → 7 天內 → 更久之後 → 無期限 → 已完成），並統一以旅程目的地時區計算「今天」。
2. **分頁未完成標註（不惱人提示）**：
   - 在導覽列（`Sidebar` 與 `MobileNav`）的「待辦」分頁顯示 2 階低噪狀態標註：
     - **近期需留意（已逾期或 7 天內有未完成）**：溫和實心琥珀小圓點（桌機側邊欄附低調急迫計數）。
     - **僅剩更久之後／無期限未完成**：靜音灰空心圓環（傳達「有待辦但目前不急」的放鬆感）。
     - **全部完成／無待辦**：不顯示任何標註。
3. **分頁與彈窗全面極簡化**：
   - 拔除分組與日期徽章中的大量 Emoji 與高干擾佔位橫幅（移除 `🌴 近期無須操心...` 大區塊）。
   - 統一「更久之後」與「無期限」的視覺降噪層級，修正原本無期限卡片比遠期卡片搶眼的錯亂。
   - 新增頂部極簡進度條與「已完成」快速切換提示，並明確區分「尚無待辦」與「已全部完成」的空狀態。
   - 將勾選框移至卡片左側並加大觸控熱區，取消右上角獨立 `Edit3` 小按鈕，改為點擊整張卡片開啟編輯。
   - 優化 `TodoModal` 快捷日期時區計算、iOS 日期輸入框字級（`text-[16px] sm:text-sm`）與連結欄位漸進展開。

---

## 預計修改檔案
1. `src/lib/todoUtils.ts`（新增）
   - 抽出共用的時區日期差距計算（`getTodoDueDiffDays`）、導覽分頁 2 階狀態摘要計算（`getTodoBadgeSummary`），以及本地／時區安全之快捷日期計算（`getTodayOffsetYMD`、`addDaysToYMD`）。
2. `src/components/Sidebar.tsx` & `src/components/MobileNav.tsx`
   - 接收 `todoBadge` 狀態，於「待辦」分頁呈現 2 階不惱人標註（實心琥珀點 vs 靜音空心圓環）。
3. `src/components/tabs/TodoTab.tsx`
   - 重構分組排序、極簡頂部進度列、去 Emoji 標題與日期標籤、修正 `later` / `nodate` 視覺權重、左側大熱區自訂勾選框與整張卡片點擊編輯。
4. `src/components/modals/TodoModal.tsx`
   - 修正快捷日期時區計算並補上「今天」、套用 `text-[16px] sm:text-sm` iOS 防縮放規範、連結預設單欄漸進展開第 2 格，移除未使用之分類 prop。
5. `src/app/trip/[id]/page.tsx`
   - 計算 `todoBadgeSummary` 並傳遞至 `Sidebar` 與 `MobileNav`，將 `timezone` 與 `onToggleHideDone` 傳入 `TodoTab` / `TodoModal`。

---

## 驗證方式
1. 執行 `npm run lint` 與 `npm run build` 確認 TypeScript 型別與建置零錯誤。
2. 檢查所有時間排序、2 階分頁標註邏輯、空狀態／全完成狀態切換與表單連結展開無誤。
3. 完成驗證後依規範自動執行 `git add`、`git commit` 與 `git push` 推送至 `origin/main`。
