---
name: pageshot
description: >
  Web app browser verification with screenshots. Reads operation_check.md,
  executes each step via agent-browser, and generates a self-contained HTML
  report with Base64-embedded screenshots.
  Use when: ブラウザ動作確認, スクショレポート, browser verification, screenshot report,
  operation check. Do NOT use for automated E2E tests (use /code with playwright).
allowed-tools: Read, Write, Bash(agent-browser:*), Bash(mkdir:*), Bash(date:*),
  Bash(python3:*), Bash(open:*)
argument-hint: "[path/to/operation_check.md]"
user-invocable: true
---

# /pageshot - Browser Verification Report

operation_check.mdの手順に従いブラウザを操作し、スクショ付きHTMLレポートを生成する。

## Input

$1: operation_check.mdのパス（省略時: カレントディレクトリのoperation_check.md）

ファイルが存在しない場合はテンプレートをWriteで作成し、編集を促してから停止する。

```
operation_check.md を作成しました。URL と手順を記入して /pageshot を再実行してください。
```

### operation_check.md Format

```
# [タイトル]

URL: http://localhost:3000

## Steps

1. [手順1の説明]
2. [手順2の説明]
```

URLフィールドは必須。stepsは番号付きリストで記述。

## Execution

| Step | Action |
| ---- | ------ |
| 1 | operation_check.md を Read で読み込み、タイトル・URL・steps を解析する |
| 2 | 出力ディレクトリを作成: `~/.claude/workspace/pageshot/$(date +%Y%m%d-%H%M%S)/` |
| 3 | `agent-browser open {URL}` でページを開く |
| 4 | 各 step を実行（→ Step Loop） |
| 5 | マニフェスト JSON を書き出し、`generate_report.py` でレポートを生成する |
| 6 | `open {report_path}` でブラウザに表示する |
| 7 | レポートパスと結果サマリーをユーザーに返す |

## Step Loop

各stepについて以下の順序で実行する。順序を省略しない。

| Action | Command |
| ------ | ------- |
| 1. ページ状態を把握 | `agent-browser snapshot` |
| 2. 手順を解釈してブラウザ操作 | `agent-browser {click/type/fill/press/...}` |
| 3. スクショ撮影 | `agent-browser screenshot --full {outdir}/screenshots/step-{n:02d}.png` |
| 4. 結果を記録 | status: ok/fail + 観察メモ（1〜2文） |

snapshotは毎ステップ実行する。アクセシビリティツリーで要素を特定してから操作する。
操作が複数になる場合は最終操作後にスクショを1枚撮影する。
操作が不要な確認のみのステップも、スクショを1枚撮影する。

## Manifest JSON

全ステップ完了後、以下の構造で `{outdir}/manifest.json` に書き出す。

```json
{
  "title": "...",
  "url": "...",
  "executed_at": "YYYY-MM-DD HH:MM:SS",
  "steps": [
    {
      "n": 1,
      "text": "...",
      "status": "ok",
      "note": "観察メモ",
      "screenshot": "{outdir}/screenshots/step-01.png"
    }
  ]
}
```

## Report Generation

```bash
python3 ~/.claude/skills/pageshot/generate_report.py \
  {outdir}/manifest.json \
  -o {outdir}/report.html
```

出力パスがstdoutに出力される。それを `open` コマンドに渡す。

## Output

```
レポート生成完了: ~/.claude/workspace/pageshot/20260416-143022/report.html
成功: N件 / 失敗: M件
```

失敗ステップがある場合は、失敗したstep番号と観察メモを箇条書きで列挙する。
