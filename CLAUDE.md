# crypto-trading-dashboard 開発規約

## 品質ゲート（全PR必須）
1. `npm run build` エラーなし
2. `npx playwright test` 全PASS
3. null安全性: APIフィールドは全て null になりうると想定
4. 新ページ → smoke + null-safety E2Eテスト追加

## 必読ルール（金科玉条）
| ルール | 文書 | 防ぐ問題 |
|--------|------|----------|
| UI 5状態ルール | docs/rules/ui-five-states.md | 状態漏れ(loading/empty/error) |
| API連携 | docs/rules/api-integration.md | 4xx/5xx未ハンドリング |
| 型同期 | docs/rules/type-sync.md | Bot API↔TS型不整合 |

## コードレビューチェックリスト
- [ ] `npm run build` エラーなし
- [ ] Playwright テスト PASS
- [ ] null 安全性: 全APIフィールドに null ガード
- [ ] UI 5状態: Loading/Error/Empty/Data/Pagination 実装済み
- [ ] レスポンシブ: モバイル表示が崩れない
- [ ] ナビゲーション: 新ページは `layout.tsx` の navItems に追加
- [ ] docs/rules/ の該当ルールに違反していないか確認済み

## アーキテクチャ
```
src/
  app/           # Next.js App Router ページ
  components/    # 共通コンポーネント
  lib/api.ts     # API fetch関数（fetchJSON<T>() 経由）
  types/index.ts # TypeScript型定義（Bot Pydanticモデルが正）
e2e/             # Playwright E2Eテスト
docs/
  rules/         # 開発ルールドキュメント（金科玉条）
```

## API接続
- **開発**: `next.config.ts` の rewrite で `localhost:8000` にプロキシ
- **本番**: Vercel 環境変数 `API_BASE_URL` で VPS API にプロキシ（rewrite経由）
- フロントエンドは常に `/api/*` を呼ぶ（直接VPS URLを呼ばない）
- 全API呼び出しは `lib/api.ts` の `fetchJSON<T>()` 経由で統一

## デプロイ
- **Vercel**: `vercel --prod --scope takaganasus-projects`
- **環境変数**: `API_BASE_URL=http://149.28.147.123`（Vercel Production に設定済み）
- **リージョン**: sin1（シンガポール）— vercel.json で設定済み

## 型同期の鉄則
- Bot APIのPydanticモデルが**正 (source of truth)**
- `src/types/index.ts` はBot側と完全一致させること
- 詳細: docs/rules/type-sync.md
