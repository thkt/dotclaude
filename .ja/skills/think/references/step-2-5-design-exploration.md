# Steps 2-5: 設計探索

## Step 2: コードベース探索

関連コードを読む。`.claude/workspace/research/` の最近の調査出力を確認する。関連ファイルがあれば読み込み、過去の調査コンテキストを引き継ぐ。パターン、制約、アーキテクチャ、先行例を把握する。

## Step 3: アプローチ生成

以下の視点から異なる 2 つ以上のアプローチを生成する。アプローチが独立した技術判断 (例: フレームワーク、ステート管理、API スタイル) を含むときは、それぞれを別の選択質問として提示する (1 メッセージにつき 1 質問、推奨と影響を添える)。密に結合した判断のみまとめる。

| 視点        | 質問                                       |
| ----------- | ------------------------------------------ |
| Pragmatist  | 動く中で最も単純な解は何か?                |
| Architect   | 拡張性があり構造が良いものは何か?          |
| DX Advocate | 開発者 / ユーザー体験に最も良いものは何か? |

<!-- canonical: rules/core/PREFLIGHT.md (decomposition thresholds) -->

分割単位: 1 AC (outcome) = 1 Unit。各 Unit は Why Outcome の単一の受け入れ基準に紐づき、独自の SOW/Spec を持ち、`/code` で実行可能。Unit 内では構造的しきい値 (Files ≥ 5, Features ≥ 3, Layers ≥ 3) を超えればさらに分割する。これらは認知負荷とスコープを御せる範囲に保つためのハードルール。PREFLIGHT.md の Lines は工数指標であり、ここでは意図的に使わない。

## Step 4: 設計チャレンジ

Step 3 のアプローチに対し `critic-design` エージェント (バックグラウンド) をスポーンする。エージェントは Read/ugrep/bfs で自前のコンテキストを集める。

DA の結果を判定テーブル + 実行可能項目とともに提示する。Step 5 へ進む前に発見事項に基づいてアプローチを改訂する。

## Step 5: 設計の構成

生き残ったアプローチから最適な設計を構成する。2 つの視点を順に通す。

### 5-1. ドメイン視点 (What)

技術非依存のビジネスロジックモデリング。Why Outcome が要求するものだけを含める。AC が紐づく概念のみ。AC との結びつきがない項目はスキップする。

```markdown
### Domain Perspective

- Entities: [AC が依存する概念]
- Business Rules: [AC が依存するルール]
- Invariants: [AC が依存する条件]
```

### 5-2. 技術視点 (How)

ドメインの理解を実装設計に翻訳する。

```markdown
### Technical Perspective

- Component Architecture: [階層、境界、責務]
- State Strategy: [サーバーステート vs クライアントステート、管理アプローチ]
- NFR Application: [パフォーマンス、セキュリティ、アクセシビリティのパターン]
- Operational Concerns: [エラー境界、ロギング、ローディング状態]
```

### 統合出力

```markdown
## Design

### Key Decisions

| Decision | Choice | Rationale               |
| -------- | ------ | ----------------------- |
| ...      | ...    | traces to [perspective] |

### Implementation Sketch

- Files to modify: [file:line を伴うリスト]
- Files to create: [目的を添えたリスト]

### Trade-offs

| Accepted    | Rejected    | Why         |
| ----------- | ----------- | ----------- |
| [採用するもの] | [諦めるもの] | [根拠]      |
```
