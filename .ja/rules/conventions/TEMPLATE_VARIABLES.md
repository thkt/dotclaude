# テンプレート変数構文

テンプレートとコマンド出力での変数置換の仕様。

## 構文パターン

| パターン                         | 説明               | 例                                       |
| -------------------------------- | ------------------ | ---------------------------------------- |
| `{field}`                        | 単純フィールド     | `{project_name}`                         |
| `{object.property}`              | ネストプロパティ   | `{summary.total_findings}`               |
| `{array[].property}`             | 配列イテレーション | `{endpoints[].method}`                   |
| `{array[filter=value].property}` | フィルタ付き配列   | `{priorities[priority=critical].action}` |

## 例

### 単純フィールド

```yaml
# YAML入力
project_name: MyApp

# テンプレート
Project: {project_name}

# 出力
Project: MyApp
```

### ネストプロパティ

```yaml
# YAML入力
summary:
  total_findings: 8
  by_severity:
    critical: 0
    high: 2

# テンプレート
Findings: {summary.total_findings} | Critical {summary.by_severity.critical}

# 出力
Findings: 8 | Critical 0
```

### 配列イテレーション

```yaml
# YAML入力
endpoints:
  - method: GET
    path: /users
  - method: POST
    path: /users

# テンプレート
{endpoints[].method} {endpoints[].path}

# 出力（1項目ずつ）
GET /users
POST /users
```

### フィルタ付き配列

```yaml
# YAML入力
priorities:
  - priority: critical
    action: 即時修正
  - priority: high
    action: 今スプリントで修正

# テンプレート
即時: {priorities[priority=critical].action}

# 出力
即時: 即時修正
```

## 使用箇所

| 場所         | ファイル                                    |
| ------------ | ------------------------------------------- |
| コマンド     | `commands/audit.md`, `commands/docs.md`     |
| テンプレート | `templates/docs/*.md`, `templates/adr/*.md` |

## 注意

- 空配列は何も出力しない
- 存在しないプロパティは空文字列
- フィルタは最初の一致のみを返す
- 全件取得には配列イテレーションを使用: `{array[].property}`
