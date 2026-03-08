# 型同期手順

> 防ぐ問題: Bot API ↔ TypeScript 型不整合

## Source of Truth

Bot Pydantic ResponseModel → Dashboard TypeScript interface
（逆方向は禁止。常にBotが正）

## 型対応表

| Python (Pydantic) | TypeScript |
|-------------------|-----------|
| `int` | `number` |
| `float` | `number` |
| `str` | `string` |
| `bool` | `boolean` |
| `Optional[X]` / `X \| None` | `X \| null` |
| `list[X]` | `X[]` |
| `dict[str, Any]` | `Record<string, unknown>` |
| `datetime` | `string` |

## 同期手順

1. Bot: `src/api/models/schemas.py` のモデル変更
2. Dashboard: `src/types/index.ts` の対応interface更新
3. Dashboard: `src/lib/api.ts` のfetch関数戻り値更新
4. Dashboard: 呼び出し元ページ修正
5. 検証: `npm run build` PASS

## 確認ツール

| ツール | 用途 | タイミング |
|--------|------|-----------|
| `dashboard-api-contract-validator` | 静的型比較 | PR作成前 |
| `api-response-schema-test` | 実API疎通テスト | デプロイ前 |
| `api-breaking-change-detector` | 破壊的変更検出 | API変更時 |

## やってはいけないこと

- Dashboard側で独自に型を定義する（Botと乖離する）
- `any` や `as unknown as X` で型エラーを回避する
- Bot PRだけマージしてDashboard PRを忘れる
- Optional/Required を Bot と逆にする（Python `Optional` → TS必須フィールド等）
