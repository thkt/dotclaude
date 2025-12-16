# Claude Code 実践ワークフロー Part 2

## /research でコードベースを理解する

> **対象読者**: Claude Code を既に導入している開発チーム

「このプロジェクト、どうなってるんだっけ？」—— 理解が曖昧なまま実装を始めていませんか？この記事では、`/research` コマンドで**実装なしに調査**し、確実な理解を得る方法を紹介します。

> **Part 1 未読の方へ**
>
> - **Part 1**: Commands / Agents / Skills の三層構造
>
> `/research` は `/think` の**前段階**として使い、調査結果が計画に反映されます。

---

## 課題: 理解不足で実装を始めると詰まる

「認証機能を追加して」と言われたとき：

- プロジェクトの構造がわからない
- 既存の認証パターンがあるか不明
- どのファイルを変更すべきか見当がつかない

結果、**実装途中で「あ、ここにも影響がある」と気づき、手戻り**。

**解決策**: `/research` で実装前にコードベースを調査する。

---

## /research の役割: 実装なしの調査

`/research` は**コードを書かずに調査だけ**を行います：

`/research "認証システムの構造"`

**🔍 調査実行**

- 既存の認証パターンを発見
- 関連ファイルを特定
- 依存関係をマッピング
- 技術スタックを確認

↓

**📄 調査結果を永続化** → `.claude/workspace/research/[日付]-auth-system-context.md`

**なぜ「実装なし」が重要か？**

- 調査と実装を分離することで、**理解を確実に**
- 調査結果を文書化することで、**後から参照可能**
- `/think` への入力として、**より正確な計画**を生成

---

## 自動レベル選択: Quick / Standard / Deep

`/research` はコンテキストに応じて**調査の深さを自動選択**します：

| レベル | 内部名 | 目安時間 | 選択される状況 |
|--------|--------|----------|----------------|
| **Quick** | `quick` | 約30秒 | 初めてのプロジェクト、概要把握 |
| **Standard** | `medium` | 約2-3分 | 実装準備、特定コンポーネント調査 |
| **Deep** | `very thorough` | 約5分 | デバッグ、複雑なシステム分析 |

> **Note**: 内部では `thoroughness` パラメータで制御されます。時間は目安で、プロジェクト規模により変動します。`/audit`（Part 5）も同名のレベルがありますが、処理内容が異なるため所要時間は異なります。

### 自動選択の例

```bash
# 初めてのプロジェクト → Quick（概要）
/research

# バグ調査の文脈 → Deep（原因分析）
/research "ユーザー認証エラー"

# 実装前の準備 → Standard（詳細）
/research "データベーススキーマ"
```

### 手動オーバーライド（必要時のみ）

```bash
/research --quick "API構造"   # 強制的に概要のみ
/research --deep "全体設計"   # 強制的に詳細分析
```

> **Note**: 通常は自動選択で十分です。手動指定は「明らかに違うレベルが必要」な場合のみ。

---

## Explore Agent: 並列検索の効率化

`/research` は内部で **Task ツール**（`subagent_type: "Explore"`）を使い、**Explore Agent**（Haiku モデル）が複数の検索を**並列実行**します：

`/research "認証システム"`

**🔍 Explore Agent: 並列検索実行中...**

| ツール | クエリ | 結果 |
|--------|--------|------|
| Grep | `class.*Auth` | src/auth/AuthService.ts:15 |
| Grep | `JWT` | src/middleware/jwt.ts:8 |
| Glob | `**/auth/**` | 12 files found |
| Read | package.json | jsonwebtoken@9.0.0 |

**内部動作**: Task ツールが Explore Agent を起動し、Grep/Glob/Read を並列実行。結果を集約して信頼度マーカー付きで返します。

**なぜ並列が重要か？**

- 順次実行だと 10 検索 × 3秒 = 30秒
- 並列実行だと 10 検索 = 5秒
- **6倍の高速化**

---

## 信頼度ベースの発見物（✓/→/?）

調査結果には**信頼度マーカー**が付きます：

```markdown
## ✓ High Confidence（直接確認）
- [✓] 認証: JWT ベース（src/auth/jwt.ts:12 で確認）
- [✓] フレームワーク: Express 4.18.2（package.json:15）

## → Medium Confidence（推論）
- [→] 状態管理: Redux 風のパターン（store/ フォルダ構造から推論）
- [→] テスト: Jest を使用（jest.config.js の存在から推論）

## ? Low Confidence（要確認）
- [?] WebSocket: socket.io が依存関係にあるが、使用箇所不明
- [?] マイクロサービス: 複数の service/ フォルダがあるが、構成不明
```

### 信頼度の判断基準

| マーカー | 確信度 | 根拠 |
|---------|--------|------|
| **✓** | 80%以上 | コード内で直接確認、ファイル:行番号で参照可能 |
| **→** | 50-80% | フォルダ構造、命名規則、間接的な証拠から推論 |
| **?** | 50%未満 | 手がかりはあるが確証なし、追加調査が必要 |

**[?] が多い場合は、追加調査または確認を取る**。

---

## Context Engineering: 永続化と連携

調査結果は **Context Engineering** 形式で永続化されます：

```text
.claude/workspace/research/
└── 2025-01-15-auth-system-context.md
```

### Context ファイルの構造

```markdown
# Research Context: 認証システム
Generated: 2025-01-15
Overall Confidence: [→] 0.75

## 🎯 Purpose
認証機能追加のための既存実装調査

## 📋 Prerequisites
### Verified Facts (✓)
- [✓] JWT ベース認証 - src/auth/jwt.ts:12
- [✓] Express 4.18.2 - package.json:15

### Working Assumptions (→)
- [→] bcrypt でパスワードハッシュ - auth.service.ts の import から推論

### Unknown/Needs Verification (?)
- [?] リフレッシュトークンの実装有無

## 📊 Available Data
### Related Files
- src/auth/* - 認証関連
- src/middleware/jwt.ts - JWT 検証

### Technology Stack
- Express 4.18.2, jsonwebtoken 9.0.0, bcrypt 5.1.0
```

> **Tip**: 実際の Context ファイル例は [リポジトリ](https://github.com/thkt/claude-config) の `.claude/workspace/research/` を参照してください。

### /think との連携

`/think` は自動的に最新の Context ファイルを参照します：

`/research "認証システム"` → Context ファイル生成 → `/think "認証機能を追加"` → Context を自動読み込み → より正確な SOW + Spec を生成

**効果**:

- `/think` の `[?]` マーカーが減少
- より具体的な実装計画
- 手戻りリスクの低減

---

## 使い方の具体例

### 例1: 新プロジェクトの理解

```bash
/research
```

→ プロジェクト全体の概要（Quick レベルで自動実行）

### 例2: 特定機能の調査

```bash
/research "決済処理のフロー"
```

→ 決済関連のファイル、依存関係、パターンを調査

### 例3: バグの原因調査

```bash
/research "ログイン時のエラーハンドリング"
```

→ Deep レベルで原因分析、関連コードを網羅的に調査

### 例4: 技術選定の調査

```bash
/research "現在使用しているテストフレームワーク"
```

→ テスト関連の設定、パターン、カバレッジを調査

---

## Part 1 との連携: ワークフロー

`/research` は Part 3（/think）の前段階として使います：

`/research "対象領域"` → [✓] 既存パターン発見、[→] 影響範囲を推定、[?] 不明点を特定
↓
`/think "機能追加"` → Research Context を自動参照 → [?] が少ない高品質な SOW + Spec

**使い分け**:

| 状況 | 推奨フロー |
|------|-----------|
| 要件が明確、プロジェクト熟知 | `/think` のみ |
| 要件は明確、プロジェクト不慣れ | `/research` → `/think` |
| 要件が曖昧、深い調査が必要 | `/research` → `/think` |

---

## FAQ

### Q: /research と Plan Agent（/think 内）の違いは？

**Plan Agent**（`/think` 内で自動起動）:

- SOW/Spec 生成の**付随分析**
- 軽量（数秒）、Haiku モデル
- 目的: 既存パターンと影響範囲の把握

**/research**（独立コマンド）:

- **専用の調査フェーズ**
- 詳細（30秒〜5分）、Explore Agent
- 目的: 深い理解、永続的な文書化

**使い分け**:

- プロジェクト熟知 → `/think` のみ（Plan Agent で十分）
- プロジェクト不慣れ → `/research` → `/think`

### Q: 調査結果はどこに保存される？

```text
.claude/workspace/research/YYYY-MM-DD-[topic]-context.md
```

- プロジェクトローカル `.claude/` があれば優先
- なければ `~/.claude/workspace/research/` に保存

### Q: いつ /research を使うべき？

| ケース | /research を使う？ |
|--------|-------------------|
| 初めてのプロジェクト | ✅ 必須 |
| 久しぶりに触るコード | ✅ 推奨 |
| 複雑な依存関係がある | ✅ 推奨 |
| 単純なバグ修正 | ❌ 不要（/fix で十分） |
| 要件が完全に明確 | ❌ 不要（/think で十分） |

---

## 次回予告

**Part 3: 計画フェーズ - /think で SOW + Spec を生成する**

調査が完了したら、`/think` で「何を作るか」を明確にし、設計書（SOW + Spec）を自動生成する方法を紹介します。

---

## リポジトリ

設定ファイルの全体はこちらで公開しています。

**GitHub**: <https://github.com/thkt/claude-config>

---

*Claude Code 実践ワークフロー シリーズ*

- [Part 1: 三層設計](./part1-three-layer-architecture.md)
- **Part 2: 調査フェーズ（/research）** ← 今回
- [Part 3: 計画フェーズ（/think）](./part3-think-sow-spec.md)
- [Part 4: 実装フェーズ（/code）](./part4-code-implementation.md)
- [Part 5: 品質フェーズ（/audit）](./part5-review-quality.md)
- [Part 6: 横断的関心事（PRE_TASK_CHECK）](./part6-pre-task-check.md)
