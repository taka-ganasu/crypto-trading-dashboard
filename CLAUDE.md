# crypto-trading-dashboard 開発規約

## 品質ゲート（全PR必須）

### 1. ビルド
- `npm run build` でエラーなし確認後にPR作成
- TypeScript strict モード: 型エラーは放置しない

### 2. E2Eテスト
- `npm run test:e2e` で Playwright テスト全PASS
- 新ページ追加時: `e2e/smoke.spec.ts` にスモークテスト追加
- APIモック付き null 安全性テスト: `e2e/null-safety.spec.ts` に追加

### 3. null安全性（最重要）
- APIレスポンスのフィールドは**全て null になりうる**と想定する
- `.toFixed()`, `.toLocaleString()`, `.map()` 等の呼び出し前に必ず null チェック
- パターン: `{value != null ? value.toFixed(2) : "—"}`
- 新しい API データ表示を追加したら、null レスポンスでクラッシュしないことを確認

### 4. コードレビューチェックリスト
- [ ] `npm run build` エラーなし
- [ ] Playwright テスト PASS
- [ ] null 安全性: 全ての API フィールドに null ガード
- [ ] レスポンシブ: モバイル表示が崩れない
- [ ] ナビゲーション: 新ページは `layout.tsx` の navItems に追加

## アーキテクチャ

```
src/
  app/           # Next.js App Router ページ
  lib/api.ts     # API fetch 関数（BASE_URL 経由）
  types/index.ts # TypeScript 型定義
```

## API接続

- **開発**: `next.config.ts` の rewrite で `localhost:8000` にプロキシ
- **本番**: Vercel 環境変数 `API_BASE_URL` で VPS API にプロキシ（rewrite経由）
- フロントエンドは常に `/api/*` を呼ぶ（直接VPS URLを呼ばない）

## デプロイ

- **Vercel**: `vercel --prod --scope takaganasus-projects`
- **環境変数**: `API_BASE_URL=http://149.28.147.123`（Vercel Production に設定済み）
- **リージョン**: sin1（シンガポール）— vercel.json で設定済み
