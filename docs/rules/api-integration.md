# API連携ルール

> 防ぐ問題: API変更→フロント4xx/5xx、エラーハンドリング不足

## A1: fetchJSON パターン

全API呼び出しは `src/lib/api.ts` の `fetchJSON<T>()` を経由する。直接 `fetch()` 禁止。

```tsx
// src/lib/api.ts:41-60 — fetchJSON の実装
async function fetchJSON<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as Promise<T>;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

- 5秒タイムアウト（AbortController）内蔵
- `BASE_URL` = `NEXT_PUBLIC_API_URL` または `/api`（next.config.ts rewrites 経由でBot APIへ転送）
- API URLをページ内にハードコード禁止

## A2: エラーハンドリング

| パターン | 方法 | 理由 |
|----------|------|------|
| 複数API同時呼び出し | `Promise.allSettled` | 1つ失敗しても他を表示 |
| 単一API | `.catch()` で error state 設定 | エラー表示をUIに反映 |
| 4xx/5xx | エラーメッセージをUIに表示 | 静かに失敗しない |

```tsx
// src/app/page.tsx:88-95 — Dashboard: 5つのAPIを同時呼び出し
const [portfolioResult, cbResult, tradesResult, healthResult, statsResult] =
  await Promise.allSettled([
    fetchPortfolioState(),
    fetchCircuitBreakerState(),
    fetchTrades(undefined, 3),
    fetchBotHealth(),
    fetchSystemStatsOverview(),
  ]);

// 各結果を個別にハンドリング
if (portfolioResult.status === "fulfilled") setPortfolio(portfolioResult.value);
if (portfolioResult.status === "rejected") failedSections.push("Portfolio");
```

```tsx
// src/app/trades/page.tsx:48-54 — 単一APIパターン
fetchTrades(undefined, PAGE_SIZE, start, end, apiExecutionMode, offset)
  .then((res) => {
    setTrades(res.trades);
    setTotalTrades(res.total);
  })
  .catch((e: Error) => setError(e.message))
  .finally(() => setLoading(false));
```

## A3: レスポンス型の安全な使用

- APIレスポンスの型は **Bot Pydanticモデルが正**（source of truth）
- Dashboard TypeScript型は `src/types/index.ts` で定義
- `.trades`, `.signals` 等のネストアクセス前にnullチェック
- `any` 型で逃げない — 全フィールドに明示的な型定義

```tsx
// src/types/index.ts — Bot Pydanticと1:1対応する型定義
export interface Trade {
  id: number;
  symbol: string;
  side: string;
  entry_price: number;
  exit_price: number | null;  // Optional[float] → number | null
  pnl: number | null;
  strategy: string | null;
  // ...
}
```

## A4: 新しいfetch関数追加手順

1. **Bot側スキーマ確認**: `src/api/models/schemas.py` のPydanticモデルを読む
2. **型追加**: `src/types/index.ts` にinterfaceを追加（Bot Pydanticと1:1対応）
3. **fetch関数追加**: `src/lib/api.ts` に `fetchXxx()` を追加（`fetchJSON<T>()` 経由）
4. **ページで使用**: ページコンポーネントで呼び出し（5状態ルール準拠）
5. **E2Eモック追加**: `e2e/test-utils.ts` の `defaultApiResponses` にモックレスポンス追加
6. **E2Eテスト追加**: スモーク + null-safety テスト

```tsx
// e2e/test-utils.ts — モック追加例
export const defaultApiResponses: ApiResponseMap = {
  "/api/trades": { trades: [...], total: 1, offset: 0, limit: 50 },
  "/api/new-endpoint": { /* 新エンドポイントのモック */ },
};

// nullSafeApiResponses にも空/null版を追加
export const nullSafeApiResponses: ApiResponseMap = {
  "/api/new-endpoint": { /* 全Optional項目をnullにした版 */ },
};
```

## A5: やってはいけないこと

- 直接 `fetch("http://149.28.147.123/api/...")` をページに書く
- エラーを `console.log` だけで処理する（UIに表示すること）
- APIが返すフィールドを型定義なしで直接アクセスする
- 1つのAPIエラーでページ全体を壊す（`Promise.allSettled` を使え）
- `src/lib/api.ts` を経由せずに独自のfetch wrapperを作る
