# Welcome to [Team Name]

## How We Use Claude

2026-08-17 時点の実測。過去 30 日に更新されたセッションログ 6018 件から、`<command-name>` の出現を集計した。その後に消えたコマンドは載せていない。

```text
Top Skills & Commands
/clear ████████████████████ 111
/model ███░░░░░░░░░░░░░░░░░ 14
/compact ███░░░░░░░░░░░░░░░░░ 14
/exit ██░░░░░░░░░░░░░░░░░░ 10
/code-review █░░░░░░░░░░░░░░░░░░░ 6
```

MCP Servers: 同じ期間の呼び出しは 0 件。

## Your Setup Checklist

### Codebases

- [ ] dotclaude. github.com/thkt/dotclaude (Claude Code 設定: agents, skills, hooks, rules)
- [ ] scout. ~/GitHub/cli/scout (Web 取得/検索 CLI)
- [ ] recall. ~/GitHub/cli/recall (セッション検索)
- [ ] shields. ~/GitHub/cli/shields (PreToolUse ガードフック。現在 settings.json 未配線)
- [ ] guardrails. ~/GitHub/cli/guardrails (lint フック。現在 settings.json 未配線)
- [ ] kiku. ~/GitHub/cli/kiku (Slack セマンティック検索)
- [ ] kagami. ~/GitHub/apps/kagami (セッション追跡アプリ)
- [ ] tally. ~/GitHub/cli/tally (エンジニアリング時間追跡)

### CLI Tools to Install

- [ ] scout. Web 検索、ページ取得、GitHub リポジトリ探索、Slack メッセージ取得。`brew install thkt/tap/scout`
- [ ] recall. 過去セッションの横断検索。`brew install thkt/tap/recall`
- [ ] codegraph. シンボル単位の構造クエリ。`npm i -g @colbymchenry/codegraph` の後、リポジトリごとに `codegraph init`
- [ ] gh. GitHub API アクセス。`brew install gh && gh auth login`

### Skills to Know About

- `/scoping`. 要求、完了条件、検証方法を整理し、合意した範囲を GitHub Issue にする。機能とバグのどちらで始めるときもここから入る。
- `/implement`. 合意済みの Issue を `launch.ts` で draft PR まで進める。
- `/compact`. 使用率が 70% に近づいたらコンテキストを要約・圧縮する。長いセッションで先回り実行する。

## Team Tips

未執筆。

## Get Started

未執筆。

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy. warm, conversational,
not lecture-y.

Open with a warm welcome. include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes. [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections. offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data. don't extrapolate them into a "team
workflow" narrative. -->
