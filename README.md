# Crypto Trading Dashboard

暗号資産トレーディングボットの状態を可視化するダッシュボードアプリケーションです。  
フロントエンドは **Next.js 16 + React 19 + Tailwind CSS 4** で構築されています。

## プロジェクト概要

- フレームワーク: Next.js 16 (App Router)
- UI: React 19 + Tailwind CSS 4
- チャート: Recharts
- テスト: Playwright E2E
- API連携: `next.config.ts` の `rewrites` で `/api/*` をバックエンドへプロキシ

## ページ一覧（全10ページ）

1. `/` - Dashboard
2. `/trades` - Trade History
3. `/signals` - Signals
4. `/portfolio` - Portfolio
5. `/performance` - Performance
6. `/analysis` - Analysis
7. `/strategies` - Strategies
8. `/circuit-breaker` - Circuit Breaker
9. `/mdse` - MDSE
10. `/system` - System

## 主要コンポーネント一覧

- `AppShell` - サイドバー/ヘッダーを含む全体レイアウト
- `TimeRangeFilter` - 期間フィルター（URLクエリ連動）
- `LoadingSpinner` - ローディング表示の共通UI
- `DetailPanel` - 詳細表示のスライドパネル
- `StatsOverviewCards` - ダッシュボード統計カード
- `SystemStatusWidget` - Bot稼働ステータス表示
- `CycleTable` / `RegimeTimeline` - Analysisページのテーブル/タイムライン
- `StrategyCard` / `StrategyTable` - Strategiesページ表示
- `DailyPnlChart` / `EquityCurveChart` / `StrategyAllocationPie` / `MdseTimelineChart` - 各種チャート
- `ErrorBoundary` - コンポーネントレベルのエラー境界

## 開発方法

```bash
npm install
npm run dev
```

- 開発サーバー: `http://localhost:3000`
- 本番ビルド確認:

```bash
npm run build
```

## テスト

- E2Eテスト実行:

```bash
npx playwright test
```

- 現在のE2Eテスト規模: **78テスト**

## APIプロキシ設定

`next.config.ts` で `/api/:path*` をバックエンドAPIへプロキシしています。

- 開発時デフォルト: `http://localhost:8000`
- 本番時: 環境変数 `API_BASE_URL` を使用
- フロントエンド側は常に `/api/*` を呼び出します

## Vercelデプロイ情報

- デプロイコマンド:

```bash
vercel --prod --scope takaganasus-projects
```

- 必須環境変数（Production）:
  - `API_BASE_URL=http://149.28.147.123`
- リージョン: `sin1`（`vercel.json`）
