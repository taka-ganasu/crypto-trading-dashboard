# UI 5状態ルール

> 防ぐ問題: UI/UX考慮不足（loading表示なし、エラー白画面、空データ未対応）

データを表示するコンポーネントは必ず5つの状態を実装する。

## 1. Loading状態

- `LoadingSpinner` を表示する。白画面は絶対禁止
- コンポーネント: `src/components/LoadingSpinner.tsx`（`role="status"`, `aria-live="polite"` 付き）
- ページレベル: `<Suspense fallback={<LoadingSpinner label="..." />}>` で囲む
- データフェッチ中: `if (loading) return <LoadingSpinner label="Loading trades..." />`

```tsx
// src/app/trades/page.tsx:16 — Suspense boundary
<Suspense fallback={<LoadingSpinner label="Loading trades..." />}>
  <TradesContent />
</Suspense>

// src/app/trades/page.tsx:59-61 — フェッチ中のfallback
if (loading) {
  return <LoadingSpinner label="Loading trades..." />;
}
```

## 2. Error状態

- 赤系バナーでエラーメッセージ表示。`role="alert"` 必須（スクリーンリーダー対応）
- 複数API呼び出し時は1つ失敗しても他のデータは表示する（`Promise.allSettled`）

```tsx
// src/app/trades/page.tsx:74-81 — エラーバナー
{error && (
  <div
    className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
    role="alert"
  >
    Data unavailable: {error}
  </div>
)}
```

## 3. Empty状態

- 「No data found」等の明示的メッセージ。テーブルなら `colSpan` 付きの空行
- 空状態をヘッダだけのテーブルや白画面で放置しない

```tsx
// src/app/trades/page.tsx:99-104 — テーブル空行
{trades.length === 0 ? (
  <tr>
    <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
      No trades found
    </td>
  </tr>
) : ( /* データ行 */ )}

// src/components/EquityCurveChart.tsx:73 — チャート空状態
<p className="text-zinc-500">No equity data available</p>
```

## 4. Data状態（正常表示）

- null安全: **全フィールド**に null ガード。`value != null ? format(value) : "—"`
- `.toFixed()`, `.toLocaleString()`, `.map()` 呼び出し前に必ず null チェック

```tsx
// src/app/trades/page.tsx:157-158 — exit_price の null ガード
{trade.exit_price != null
  ? formatNumber(trade.exit_price)
  : <span className="text-zinc-500 italic">Open</span>}

// src/app/trades/page.tsx:162-167 — pnl の null ガード
{trade.pnl != null ? (
  <span className={colorByPnl(trade.pnl)}>
    {formatPnl(trade.pnl)}
  </span>
) : (
  <span className="text-zinc-500">-</span>
)}

// src/app/trades/page.tsx:131 — execution_mode の null ガード
{trade.execution_mode != null ? ( /* バッジ表示 */ ) : (
  <span className="text-zinc-500">-</span>
)}
```

## 5. Pagination状態（リストの場合）

- 25件以上のリストには必ずページネーション
- Pattern: Prev/Next ボタン + "Page X of Y" テキスト + total count
- ページサイズ目安: テーブル25件（`PAGE_SIZE = 25`）、カード12件
- フィルタ変更時は `page = 1` にリセット

```tsx
// src/app/trades/page.tsx:22 — ページサイズ定数
const PAGE_SIZE = 25;

// src/app/trades/page.tsx:42-43 — フィルタ変更でリセット
useEffect(() => {
  setCurrentPage(1);
}, [start, end, apiExecutionMode]);

// src/app/trades/page.tsx:183-205 — ページネーションUI
{totalPages > 1 && (
  <div className="mt-4 flex items-center justify-between">
    <span className="text-sm text-zinc-500">
      Page {currentPage} of {totalPages}
    </span>
    <div className="flex gap-2">
      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        disabled={currentPage <= 1}>Prev</button>
      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        disabled={currentPage >= totalPages}>Next</button>
    </div>
  </div>
)}
```

## チェックリスト

新ページ/コンポーネント作成時:

- [ ] Loading表示あり（`LoadingSpinner` コンポーネント使用, `src/components/LoadingSpinner.tsx`）
- [ ] Error表示あり（`role="alert"` 付き赤系バナー）
- [ ] Empty表示あり（意味のあるメッセージ, テーブルなら `colSpan` 付き）
- [ ] 全APIフィールドに null ガード（`value != null ? format(value) : "—"`）
- [ ] リストにはページネーション（25件以上）またはデータが少ないことの根拠コメント
- [ ] E2Eテストで5状態をカバー（`e2e/test-utils.ts` の `nullSafeApiResponses` でnull系テスト）
