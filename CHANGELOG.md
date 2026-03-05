# CHANGELOG

Dashboard の変更履歴です。  
このファイルの PR 一覧は `gh pr list --state merged --limit 20` を基準に、`2026-03-06` 時点で整理しています。

## PR ハイライト（#11〜#23）

| PR | 状態 | タイトル | 概要 |
| --- | --- | --- | --- |
| [#23](https://github.com/taka-ganasu/crypto-trading-dashboard/pull/23) | OPEN | docs: Dashboard READMEを新規整備 | READMEの全面整備（構成、ページ、運用情報） |
| [#22](https://github.com/taka-ganasu/crypto-trading-dashboard/pull/22) | OPEN | Dashboard品質強化: error.tsx/404/favicon/E2E追加 | App Routerのエラーハンドリングと404、favicon、E2E追加 |
| [#21](https://github.com/taka-ganasu/crypto-trading-dashboard/pull/21) | MERGED | Dashboardアクセシビリティ強化: LoadingSpinner共通化とOGP/E2E追加 | アクセシビリティ改善、OGP設定、関連E2E拡張 |
| [#20](https://github.com/taka-ganasu/crypto-trading-dashboard/pull/20) | MERGED | Add responsive E2E tests and mobile navigation shell | レスポンシブE2EとモバイルナビUIを強化 |
| [#19](https://github.com/taka-ganasu/crypto-trading-dashboard/pull/19) | MERGED | test: expand dashboard detail e2e coverage | 詳細画面のE2Eカバレッジ拡張 |
| [#18](https://github.com/taka-ganasu/crypto-trading-dashboard/pull/18) | MERGED | fix: stabilize dashboard E2E by using production web server | E2E実行を本番ビルドサーバー起動に統一し安定化 |
| [#17](https://github.com/taka-ganasu/crypto-trading-dashboard/pull/17) | MERGED | feat: add dashboard system overview widget | DashboardトップにSystem Overviewウィジェット追加 |
| [#16](https://github.com/taka-ganasu/crypto-trading-dashboard/pull/16) | MERGED | feat: add PnL chart and strategy allocation pie to portfolio page | Portfolio に PnL チャートと配分円グラフを追加 |
| [#15](https://github.com/taka-ganasu/crypto-trading-dashboard/pull/15) | MERGED | feat: add MDSE detector timeline chart | MDSEタイムライン可視化を追加 |
| [#14](https://github.com/taka-ganasu/crypto-trading-dashboard/pull/14) | MERGED | feat: add analysis page with cycle timeline and signal stats | Analysisページ（サイクル分析・統計）を追加 |
| [#13](https://github.com/taka-ganasu/crypto-trading-dashboard/pull/13) | MERGED | feat: add /strategies page with strategy performance dashboard | Strategiesページを新設し戦略比較を追加 |
| [#12](https://github.com/taka-ganasu/crypto-trading-dashboard/pull/12) | MERGED | feat: add TimeRangeFilter component (24h/7d/30d/90d/All) | 時間範囲フィルターを共通化 |
| [#11](https://github.com/taka-ganasu/crypto-trading-dashboard/pull/11) | MERGED | feat: add equity curve chart to Performance page | Performanceページにエクイティカーブを追加 |

## E2Eテスト推移

- 初期フェーズ: **18 テスト**
- 拡張フェーズ: **78+ テスト**
- 主な拡張領域:
  - detail表示系
  - null safety
  - responsive
  - accessibility
  - error handling

## 備考

- マージ済みPRの取得コマンド:
  - `gh pr list --state merged --limit 20`
- #22 / #23 は同日作業として追跡対象に含め、状態を明記しています。
