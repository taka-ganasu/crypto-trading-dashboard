# Crypto Trading Dashboard

暗号資産トレーディングボットの状態を可視化するダッシュボードアプリケーションです。
フロントエンドは **Next.js 16 + React 19 + Tailwind CSS 4** で構築されています。

## プロジェクト概要

- フレームワーク: Next.js 16 (App Router)
- UI: React 19 + Tailwind CSS 4
- チャート: Recharts
- テスト: Vitest (ユニット/コンポーネント) + Playwright (E2E)
- API連携: `next.config.ts` の `rewrites` で `/api/*` をバックエンドへプロキシ

## ページ一覧（全10ページ）

1. `/` - Dashboard（統計カード・PnLチャート・ステータスウィジェット）
2. `/trades` - Trade History（取引履歴テーブル・詳細パネル）
3. `/signals` - Signals（シグナル一覧・フィルター）
4. `/portfolio` - Portfolio（アロケーション・戦略別配分）
5. `/performance` - Performance（エクイティカーブ・日次PnL）
6. `/analysis` - Analysis（サイクルテーブル・レジームタイムライン）
7. `/strategies` - Strategies（戦略カード・パフォーマンス比較）
8. `/circuit-breaker` - Circuit Breaker（CB状態・トリガー履歴）
9. `/mdse` - MDSE（ディストーション検出・イベント一覧・タイムライン）
10. `/system` - System（ヘルス・メトリクス・設定・エラーログ）

## 主要コンポーネント一覧

### レイアウト・共通
- `AppShell` - サイドバー/ヘッダーを含む全体レイアウト
- `TimeRangeFilter` - 期間フィルター（URLクエリ連動）
- `ExecutionModeFilter` - 実行モードフィルター
- `LoadingSpinner` - ローディング表示の共通UI
- `DetailPanel` / `DetailRow` - 詳細表示のスライドパネル
- `ErrorBoundary` - コンポーネントレベルのエラー境界

### Dashboard
- `StatsOverviewCards` - ダッシュボード統計カード
- `SystemStatusWidget` - Bot稼働ステータス表示

### チャート
- `DailyPnlChart` / `CumulativePnlChart` - 日次PnL・累積PnL
- `EquityCurveChart` - エクイティカーブ
- `StrategyAllocationPie` - 戦略配分円グラフ
- `DailyStrategyPnlChart` - 戦略別日次PnL
- `MdseTimelineChart` - MDSEタイムラインチャート

### Analysis
- `CycleTable` - サイクルテーブル
- `RegimeTimeline` - レジームタイムライン

### Strategies
- `StrategyCard` / `StrategyTable` - 戦略カード・テーブル

### System（BL-075分割済み）
- `HealthSection` - ヘルスチェック表示
- `MetricsSection` - メトリクス表示
- `ConfigSection` - 設定情報表示
- `ErrorLogSection` - エラーログ表示

### MDSE
- `MdseOverview` - MDSE概要
- `MdseEvents` - イベント一覧（ページネーション付き）
- `MdseTrades` - MDSE関連トレード
- `MdseDetectorTimeline` - ディテクタータイムライン

## テスト

### Vitest（ユニット / コンポーネント）

```bash
npx vitest run
```

- 現在のテスト規模: **782テスト**（72ファイル）

### Playwright（E2E）

```bash
npx playwright test
```

- 現在のE2Eテスト規模: **236テスト**（39ファイル）

### 合計: **1,018テスト**

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
