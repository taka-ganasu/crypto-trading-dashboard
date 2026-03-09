# 型同期手順

> 防ぐ問題: Bot API ↔ TypeScript 型不整合

## Source of Truth

```
Bot Pydantic ResponseModel  →  Dashboard TypeScript interface
  (正)                            (従)
```

**方向は常に Bot → Dashboard**。逆方向（Dashboard側で独自に型を定義）は禁止。

## 型対応表

| Python (Pydantic) | TypeScript | 例 |
|-------------------|-----------|-----|
| `int` | `number` | `id: int` → `id: number` |
| `float` | `number` | `pnl: float` → `pnl: number` |
| `str` | `string` | `symbol: str` → `symbol: string` |
| `bool` | `boolean` | `executed: bool` → `executed: boolean` |
| `Optional[X]` / `X \| None` | `X \| null` | `exit_price: Optional[float]` → `exit_price: number \| null` |
| `list[X]` | `X[]` | `list[Trade]` → `Trade[]` |
| `dict[str, Any]` | `Record<string, unknown>` | `data: dict` → `data: Record<string, unknown>` |
| `datetime` | `string` | ISO 8601文字列として受信 |

## 同期手順（5ステップ）

### Step 1: Bot Pydanticモデル変更を確認

- Bot側: `src/api/models/schemas.py` を確認
- 新フィールド・削除フィールド・型変更をリストアップ

### Step 2: Dashboard TypeScript型を更新

- ファイル: `src/types/index.ts`
- Bot Pydanticの変更を反映。Optional/Requiredの方向に注意

```tsx
// src/types/index.ts — Trade interface (Bot Pydanticと1:1)
export interface Trade {
  id: number;                    // int
  symbol: string;                // str
  exit_price: number | null;     // Optional[float]
  strategy: string | null;       // Optional[str]
  execution_mode: string | null; // Optional[str]
}
```

### Step 3: fetch関数の戻り値を更新

- ファイル: `src/lib/api.ts`
- `fetchJSON<T>()` の型パラメータを更新

### Step 4: 呼び出し元ページを修正

- 新フィールドの表示追加、削除フィールドの参照除去
- null ガード追加（5状態ルール準拠）

### Step 5: ビルド検証

```bash
npm run build   # TypeScript型エラーがないことを確認
```

## 確認ツール

| ツール | 用途 | タイミング |
|--------|------|-----------|
| `dashboard-api-contract-validator` | 静的型比較（Bot ↔ Dashboard） | PR作成前 |
| `api-response-schema-test` | 実API疎通テスト | デプロイ前 |
| `api-breaking-change-detector` | 破壊的変更検出 | API変更時 |

## やってはいけないこと

- Dashboard側で独自に型を定義する（Botと乖離する）
- `any` や `as unknown as X` で型エラーを回避する
- Bot PRだけマージしてDashboard PRを忘れる（常にペアでマージ）
- `Optional`/`Required` を Bot と逆にする（Python `Optional` → TS必須フィールド等）
- 型定義を `src/types/index.ts` 以外の場所に分散させる
