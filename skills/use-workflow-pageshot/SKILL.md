---
name: use-workflow-pageshot
description: >
  Internal helper for /pr. Reads PR body (Preview URL + How to Test), drives
  agent-browser to capture a screenshot (1 step) or a video (2+ steps), and
  returns the artifact path for manual attachment on GitHub web UI.
when_to_use: /pr workflow UI変更検出時のスクショ/動画撮影
allowed-tools: Read Bash(agent-browser:*) Bash(ffmpeg:*) Bash(mkdir:*) Bash(date:*)
model: opus
---

# use-workflow-pageshot - PR Screenshot/Video Helper

`/pr` から UI 変更検出時に呼ばれる内部ヘルパー。user 直接呼び出し対象外。

## Input

| 項目        | 取得元                                               |
| ----------- | ---------------------------------------------------- |
| Preview URL | PR body 先頭の `Preview URL: <URL>` 行               |
| Steps       | PR body の `## How to Test` セクション番号付きリスト |

PR body は `/pr` から文字列で渡される。Preview URL か How to Test が欠落してたら `mode: failed` と欠落項目名を返して `/pr` に判断を委ねる。

## Mode Selection

| Steps 数 | モード     | 成果物      |
| -------- | ---------- | ----------- |
| 1        | screenshot | step-01.png |
| 2+       | video      | capture.mp4 |

## Execution

| Step | Action                                                                   |
| ---- | ------------------------------------------------------------------------ |
| 1    | 出力先作成: `~/.claude/workspace/pageshot/$(date +%Y%m%d-%H%M%S)/`       |
| 2    | `agent-browser open {Preview URL}`                                       |
| 3    | Mode に応じて Screenshot Flow または Video Flow                          |
| 4    | 成果物の絶対パスを stdout に出す                                         |

## Screenshot Flow (1 step)

| # | Command                                                             |
| - | ------------------------------------------------------------------- |
| 1 | `agent-browser snapshot` でアクセシビリティツリー取得               |
| 2 | step に操作が含まれれば `agent-browser {click/type/fill/...}` 実行 |
| 3 | `agent-browser screenshot --full {outdir}/step-01.png`              |

## Video Flow (2+ steps)

| # | Command                                                             |
| - | ------------------------------------------------------------------- |
| 1 | `agent-browser record start {outdir}/capture.webm`                  |
| 2 | 各 step で `snapshot` → 操作 を順次実行                             |
| 3 | `agent-browser record stop`                                         |
| 4 | `ffmpeg -i {outdir}/capture.webm -vcodec libx264 {outdir}/capture.mp4` |

step 間で `agent-browser wait 500` を挟む。各操作前に `snapshot` して要素特定する。

## Output

stdout 1 行のみ:

```
mode=screenshot artifact=/absolute/path/to/step-01.png
```

or

```
mode=video artifact=/absolute/path/to/capture.mp4
```

失敗時:

```
mode=failed reason=<one-line reason>
```
