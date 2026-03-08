# API連携ルール

> 防ぐ問題: API変更→フロント4xx/5xx、エラーハンドリング不足

## A1: fetchJSON パターン

- 全API呼び出しは `lib/api.ts` の `fetchJSON<T>()` 経由
- 5秒タイムアウト（AbortController）
- 直接 `fetch()` を書かない
- API URLはハードコード禁止（`/api/*` 経由で統一）

## A2: エラーハンドリング

| パターン | 方法 | 理由 |
|----------|------|------|
| 複数API同時呼び出し | `Promise.allSettled` | 1つ失敗しても他を表示 |
| 単一API | `.catch()` で error state 設定 | エラー表示をUIに反映 |
| 4xx/5xx | エラーメッセージをUIに表示 | 静かに失敗しない |

```tsx
// 複数APIの正しいパターン
const [tradesResult, signalsResult] = await Promise.allSettled([
  fetchTrades(),
  fetchSignals()
]);
if (tradesResult.status === "fulfilled") setTrades(tradesResult.value);
if (tradesResult.status === "rejected") setTradeError(tradesResult.reason.message);
```

## A3: レスポンス型の安全な使用

- APIレスポンスの型は Bot Pydanticモデルが正（source of truth）
- `.trades`, `.signals` 等のネストアクセス前にnullチェック
- レスポンス形状が変わったら TypeScript型 + fetch関数 + 呼び出し元を全て修正
- `any` 型で逃げない

## A4: 新しいfetch関数追加手順

1. Bot側のPydanticスキーマを確認（`src/api/models/*.py`）
2. `src/types/index.ts` に型追加
3. `src/lib/api.ts` にfetch関数追加
4. ページコンポーネントで使用
5. `e2e/test-utils.ts` の `defaultApiResponses` にモック追加
6. E2Eテストでスモーク+null-safetyテスト追加

## A5: やってはいけないこと

- 直接 `fetch("http://149.28.147.123/api/...")` をページに書く
- エラーを `console.log` だけで処理する（UIに表示すること）
- APIが返すフィールドを型定義なしで直接アクセスする
- 1つのAPIエラーでページ全体を壊す（`Promise.allSettled` を使え）
