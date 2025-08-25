---
name: context
description: 現在のコンテキスト使用状況を診断
priority: low
suitable_for:
  type: [debug, diagnostic]
  understanding: "≥ 50%"
timeout: 30
allowed-tools: Read, Glob, Grep, LS, Bash(wc:*), Bash(du:*), Bash(find:*)
context:
  token_usage: "displayed"
  file_count: "counted"
  session_cost: "shown"
---

# /context - コンテキスト診断と最適化

## 目的

現在のコンテキスト使用状況を診断し、トークン使用量の最適化提案を行います。

## 動的コンテキスト分析

### セッション統計

```bash
!`wc -l ~/.claude/CLAUDE.md ~/.claude/rules/**/*.md 2>/dev/null | tail -1`
```

### 現在の作業ファイル

```bash
!`find . -type f -name "*.md" -o -name "*.json" -o -name "*.ts" -o -name "*.tsx" | grep -v node_modules | wc -l`
```

### セッション内の変更ファイル

```bash
!`git status --porcelain 2>/dev/null | wc -l`
```

### メモリ使用量の推定

```bash
!`du -sh ~/.claude 2>/dev/null`
```

## コンテキスト最適化戦略

### 1. ファイル分析

- **大きなファイルの検出**: 500行以上のファイルを特定
- **冗長なファイル**: 未使用ファイルの検出
- **パターンファイル**: 繰り返しパターンの圧縮提案

### 2. トークン使用量の内訳

```markdown
## トークン使用量分析
- システムプロンプト: ~[計算値]
- ユーザーメッセージ: ~[計算値]
- ツール結果: ~[計算値]
- 合計コンテキスト: ~[計算値]
```

### 3. 最適化の推奨事項

分析に基づく推奨される最適化:

1. **ファイル分割**: 大きなファイルを分割
2. **選択的読み込み**: 必要な部分のみ読み込み
3. **コンテキスト削減**: 不要な情報の削除
4. **圧縮**: 繰り返し情報の圧縮

## 使用例

### 基本的なコンテキストチェック

```bash
/context
# 現在のコンテキスト使用状況を表示
```

### 最適化付き

```bash
/context --optimize
# 最適化提案を含む詳細分析
```

### トークン制限チェック

```bash
/context --check-limit
# トークン制限に対する使用率確認
```

## 出力形式

```markdown
📊 コンテキスト診断レポート
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 使用状況:
- 現在のトークン: ~XXXk / 200k
- 使用率: XX%
- 推定残り容量: ~XXXk tokens

📁 ファイル統計:
- ロード済み: XX files
- 総行数: XXXX lines
- 最大ファイル: [filename] (XXX lines)

⚠️ 警告:
- [200k制限に近づいている場合の警告]
- [大きなファイルの警告]

💡 最適化提案:
1. [具体的な提案]
2. [具体的な提案]

📝 セッション情報:
- 開始時刻: [timestamp]
- 変更ファイル数: XX
- 推定コスト: $X.XX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 他のコマンドとの統合

- `/doctor` - システム全体の診断
- `/status` - ステータス確認
- `/cost` - コスト計算

## ベストプラクティス

1. **定期的なチェック**: 大規模作業時は定期的に実行
2. **制限前の警告**: 180k tokens（90%）で警告
3. **自動最適化**: 必要に応じて自動圧縮を提案

## 高度な機能

### コンテキスト履歴

過去のコンテキスト使用履歴を表示:

```bash
ls -la ~/.claude/logs/sessions/latest-session.json 2>/dev/null
```

### リアルタイム監視

リアルタイムで使用量を追跡:

```bash
echo "現在のコンテキスト推定を実行中..."
```

## 注記

- Version 1.0.86で追加された`exceeds_200k_tokens`フラグを活用
- settings.jsonの即時反映により、再起動なしで設定変更が可能（v1.0.90）
- SessionEndフック経由でセッション統計を自動保存
