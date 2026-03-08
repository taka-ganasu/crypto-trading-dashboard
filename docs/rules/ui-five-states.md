# UI 5状態ルール

> 防ぐ問題: UI/UX考慮不足（loading表示なし、エラー白画面、空データ未対応）

データを表示するコンポーネントは必ず5つの状態を実装する。

## 1. Loading状態
- LoadingSpinner表示。白画面禁止
- Pattern: `if (loading) return <LoadingSpinner label="Loading trades..." />`
- ページレベルでもコンポーネントレベルでも必ず表示

## 2. Error状態
- 赤系バナーでエラーメッセージ表示。`role="alert"` 必須
- Pattern: `{error && <div role="alert" className="text-red-500">Data unavailable: {error}</div>}`
- 複数API呼び出し時は1つ失敗しても他のデータは表示する（Promise.allSettled）

## 3. Empty状態
- 「No data found」等のメッセージ。テーブルならcolSpan付きの空行
- Pattern: `{items.length === 0 && <p className="text-gray-500">No trades found</p>}`
- 空状態を白画面や0件テーブルヘッダだけで放置しない

## 4. Data状態（正常表示）
- null安全: 全フィールドに null ガード
- Pattern: `{value != null ? value.toFixed(2) : "—"}`
- `.toFixed()`, `.toLocaleString()`, `.map()` 等の呼び出し前に必ず null チェック

## 5. Pagination状態（リストの場合）
- 25件以上のリストには必ずページネーション
- Pattern: Prev/Next + "Page X of Y" + total count
- ページサイズ目安: テーブル25件、カード12件
- フィルタ変更時は page=1 にリセット

## チェックリスト

新ページ/コンポーネント作成時:
- [ ] Loading表示あり（LoadingSpinnerコンポーネント使用）
- [ ] Error表示あり（`role="alert"` 付き）
- [ ] Empty表示あり（意味のあるメッセージ）
- [ ] 全APIフィールドにnullガード
- [ ] リストにはページネーション（または件数が少ないことの根拠）
- [ ] E2Eテストで5状態をカバー

## 悪い例と正しい例

### 悪い例: 状態漏れ
```tsx
export default function TradesPage() {
  const [trades, setTrades] = useState([]);
  useEffect(() => { fetchTrades().then(setTrades); }, []);
  // Loading中は何も表示されない（白画面）
  // エラー時も何も表示されない
  // tradesが空配列の時も空テーブルだけ
  return <TradeTable trades={trades} />;
}
```

### 正しい例: 5状態完備
```tsx
export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrades()
      .then(res => setTrades(res.trades))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Loading trades..." />;
  if (error) return <div role="alert" className="text-red-500">{error}</div>;
  if (trades.length === 0) return <p>No trades found</p>;

  return <TradeTable trades={trades} />;
}
```
