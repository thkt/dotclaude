# Welcome to [Team Name]

## How We Use Claude

過去 30 日における thkt の利用状況 (846 セッション) より。

Work Type Breakdown:
  Plan / Design    ██████████████░░░░░░  70%
  Improve Quality  ███░░░░░░░░░░░░░░░░░  12%
  Build Feature    ██░░░░░░░░░░░░░░░░░░  10%
  Debug / Fix      ██░░░░░░░░░░░░░░░░░░   8%

Top Skills & Commands:
  /clear           ████████████████████  582x/month
  /exit            ███████░░░░░░░░░░░░░  200x/month
  /plugin          ██░░░░░░░░░░░░░░░░░░   69x/month
  /commit          ██░░░░░░░░░░░░░░░░░░   60x/month
  /audit           █░░░░░░░░░░░░░░░░░░░   29x/month
  /challenge       █░░░░░░░░░░░░░░░░░░░   28x/month
  /think           █░░░░░░░░░░░░░░░░░░░   22x/month
  /release-notes   █░░░░░░░░░░░░░░░░░░░   21x/month
  /polish          █░░░░░░░░░░░░░░░░░░░   18x/month

Top MCP Servers:
  heptabase        ████████████████████   28 calls
  discord          ███████████████████░   26 calls
  context7         ██░░░░░░░░░░░░░░░░░░    3 calls

## Your Setup Checklist

### Codebases
- [ ] dotclaude. github.com/thkt/dotclaude (Claude Code 設定: agents, skills, hooks, rules)
- [ ] yomu. ~/GitHub/cli/yomu (セマンティック コード検索 CLI)
- [ ] scout. ~/GitHub/cli/scout (Web 取得 / 検索 CLI)
- [ ] recall. ~/GitHub/cli/recall (セッション検索)
- [ ] shields. ~/GitHub/cli/shields (PreToolUse ガード フック)
- [ ] guardrails. ~/GitHub/cli/guardrails (lint フック)
- [ ] kiku. ~/GitHub/cli/kiku (Slack セマンティック検索)
- [ ] kagami. ~/GitHub/apps/kagami (セッション追跡アプリ)
- [ ] tally. ~/GitHub/cli/tally (エンジニアリング時間追跡)

### MCP Servers to Activate
- [ ] heptabase. ナレッジベース / ノート カード。heptabase.com でアクセスを取得し、`/mcp` 経由で API キーを設定する。
- [ ] discord. 非同期 Claude 応答のための Discord bot 連携。`/discord:configure` で bot トークンを設定する。
- [ ] context7. ライブラリ ドキュメント参照。マーケットプレイスから `/plugin` で有効化する。

### Skills to Know About
- `/commit`. ステージ済み diff から Conventional Commits メッセージを生成する。手書きする代わりに編集後に実行する。
- `/audit`. 専門 reviewer (security, type safety, silent failures 等) を編成し、現コードベースに対して実行する。
- `/challenge`. 提案、設計、計画への悪魔の代弁者パス。アーキテクチャ判断を確定する前に使う。
- `/think`. SOW + Spec ドキュメントを生成する設計探索。非自明な新機能のエントリ ポイント。
- `/polish`. 軽いレビューとクリーンアップ パス。機能の落着後に slop を捕まえる。
- `/release-notes`. 最新の Claude Code 変更履歴を確認し、現環境に関連するものを示す。
- `/plugin`. インストール済みプラグインを一覧表示。マーケットプレイス エントリの有効化/無効化に使う。
- `/compact`. 使用率が 70% に近づいたらコンテキストを要約・圧縮する。長いセッションで先回り実行する。
- `/code`. リアルタイム テスト フィードバック付きの TDD/RGRC 実装ループ。

## Team Tips

_TODO_

## Get Started

_TODO_

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
