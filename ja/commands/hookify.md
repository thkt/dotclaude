---
description: 望ましくない動作を防ぐカスタムフックを作成
dependencies: [hookify]
---

# /hookify - カスタムフック作成

コード内の特定のパターンをブロックまたは警告するフックを作成します。

## 使用方法

### 引数付き（明示的な指示）

```text
/hookify TypeScriptファイルでconsole.logを使用しない
```

`.claude/hookify.{名前}.local.md`にフックルールファイルを作成します

### 引数なし（会話から自動検出）

```text
/hookify
```

最近の会話を分析して、修正したパターンを検出し、ルールを作成します。

## プロセス

1. **リクエスト分析**: 検出すべきパターンを理解
2. **ルール生成**: YAMLフロントマター + Markdownでフック設定を作成
3. **ファイル保存**: `.claude/hookify.{ルール名}.local.md`に書き込み
4. **確認**: 作成されたルールを表示

## ルールファイル形式

```yaml
---
name: ルール名
enabled: true
event: file|bash|stop|prompt
pattern: 正規表現パターン
action: warn|block
conditions:  # オプション、複雑なルール用
  - field: file_path|new_text|command
    operator: regex_match|contains|not_contains
    pattern: パターン
---

パターンが検出された時に表示されるメッセージ。
Markdownフォーマットがサポートされています。
```

## イベント

| イベント | トリガー |
|-------|---------|
| `file` | Edit/Write/MultiEdit操作 |
| `bash` | Bashコマンド実行 |
| `stop` | Claudeが停止したい時 |
| `prompt` | ユーザープロンプト送信 |

## アクション

| アクション | 動作 |
|--------|----------|
| `warn` | 警告を表示、操作を続行 |
| `block` | 操作をブロック、修正を要求 |

## 例

### 危険なコマンドをブロック

```text
/hookify rm -rfコマンドをブロック
```

作成されるもの:

```yaml
---
name: block-dangerous-rm
enabled: true
event: bash
pattern: rm\s+-rf
action: block
---
危険なrm -rfコマンドが検出されました！より安全な代替手段を使用してください。
```

### デバッグコードを警告

```text
/hookify TypeScriptファイルにconsole.logが追加された時に警告
```

作成されるもの:

```yaml
---
name: warn-console-log
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.tsx?$
  - field: new_text
    operator: contains
    pattern: console\.log
---
デバッグコードが検出されました！コミット前に削除することを忘れないでください。
```

## 関連コマンド

- `/hookify:list` - すべてのフックルールを表示
- `/hookify:configure` - ルールを対話的に有効化/無効化

## スキルリファレンス

[@~/.claude/skills/creating-hooks/SKILL.md](~/.claude/skills/creating-hooks/SKILL.md)
