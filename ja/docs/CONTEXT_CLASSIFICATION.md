# コンテキスト分類 - /code コマンド

## 目的

コンテキスト参照をEssential（常に読み込み）とReference（オンデマンド読み込み）に分類し、S/N比を向上させ、認知負荷を削減します。

## 分類

### Essential（常に読み込み） - 約310行

実装タスクで**常に必要**なコンテキスト。

| ファイル | 行数 | 目的 |
| --- | --- | --- |
| `skills/generating-tdd-tests/SKILL.md` | 258 | TDD/RGRC実装サイクル |
| `rules/core/ESSENTIAL_PRINCIPLES.md` | 約50 | クイック判断質問 |
| **合計** | **約310** | |

**理由:**

- TDD/RGRCは「作業方法」の構造を提供
- クイック判断質問は「考慮すべきこと」のチェックリストを提供
- これらは実行可能で、すべての実装タスクに適用される

### Reference（オンデマンド読み込み） - 2,000行以上

特定のタスクタイプが必要な場合のみ読み込まれるコンテキスト。

| フラグ | ファイル | 行数 | 読み込みタイミング |
| --- | --- | --- | --- |
| `--frontend` | `skills/applying-frontend-patterns/SKILL.md` | 362 | React/UIコンポーネント作業 |
| `--principles` | `skills/applying-code-principles/SKILL.md` | 430 | 設計決定、リファクタリング |
| `--storybook` | `skills/integrating-storybook/SKILL.md` | 270 | コンポーネントStories生成 |
| (自動) | `rules/development/PROGRESSIVE_ENHANCEMENT.md` | 97 | CSS-firstアプローチが必要 |
| (自動) | `rules/development/READABLE_CODE.md` | 255 | コード明瞭性の懸念 |

**理由:**

- 完全な説明は特定のシナリオでのみ必要
- 単純な実装時のノイズを削減
- より深いガイダンスが必要な場合に利用可能

## /codeでの使用方法

### デフォルトモード（Essentialのみ）

```bash
/code "ユーザー検証を実装"
# 読み込み: TDD/RGRC + クイック判断質問（約310行）
```

### フラグ付き（Essential + Reference）

```bash
/code --frontend "LoginFormコンポーネントを実装"
# 読み込み: Essential + frontend-patterns（約670行）

/code --principles "認証モジュールをリファクタリング"
# 読み込み: Essential + code-principles（約740行）
```

## 測定

### Before（現在の状態）

- /code.md: 254行
- Skills: 1,320行
- Rules: 789行
- Submodules: 718行
- **合計: 3,081行**

### After（目標状態）

- /code.md: 約150行（簡素化）
- Essential: 約310行
- Submodules: 約400行（削減）
- **合計: 約860行**（72%削減）

### フラグ付き

- +frontend: +362行
- +principles: +430行
- +storybook: +270行

## メンテナンス

新しい原則やパターンを追加する場合:

1. **すべての**実装タスクで必要かどうかを評価
2. はいの場合 → Essentialに追加（最小限に保つ）
3. いいえの場合 → 適切なフラグでReferenceに追加

## 関連ドキュメント

- [ESSENTIAL_PRINCIPLES.md](../rules/core/ESSENTIAL_PRINCIPLES.md) - クイック判断質問
- [/code コマンド](../commands/code.md) - 実装コマンド
- [code-principles SKILL](../skills/applying-code-principles/SKILL.md) - 完全な原則リファレンス
