# 待辦清單「7天內無待辦」放鬆鼓勵提示實作計畫

## 1. 需求理解與摘要 (Requirement Summary)
- **使用者需求**：當近 7 天內沒有任何待辦事項時，希望呈現一句輕鬆溫暖的鼓勵詞（例如「近期無須操心，放輕鬆 Lay back 之類的」），降低行前焦慮感。
- **設計價值 (Emotional UX & Peace of Mind)**：
  - 自由行前旅人常擔心「是不是漏了什麼事情沒做？」。
  - 當「🔥 7 天內」沒有事項時，不再只是單純讓分組消失，而是呈現一個極簡透氣的綠色微卡片：`🌴 近期無須操心，放輕鬆 Lay back & chill ✨`。
  - 明確告訴使用者：**當前進度在掌控之中，這週完全沒有需要急迫處理的事項，安心休息！**

---

## 2. 實作步驟 (Implementation Steps)

### 步驟 1：修改 `src/components/tabs/TodoTab.tsx`
- 在 `groups` 邏輯中，若有進行中的待辦事項（`hasActiveTodos`），「🔥 7 天內」分組將持續保留，即使 `upcoming.length === 0` 也不隱藏。
- 當 `group.key === 'upcoming'` 且 `group.items.length === 0` 時，渲染溫暖的舒壓微卡片：
  - 樣式：淡綠微透邊框（`bg-emerald-50/40 border-dashed border-emerald-200/70 text-emerald-800/80`），視覺舒壓放鬆。
  - 文案：`🌴 近期無須操心，放輕鬆 Lay back & chill ✨`。

### 步驟 2：建置驗證 (Verification)
- 執行 `npm run build` 確認編譯通過。

### 步驟 3：Git 自動提交與推送 (Git Commit & Push)
- 遵循規範自動執行 `git add`、`git commit` 以及 `git push origin main`。
