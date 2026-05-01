# Welcome to [Team Name]

## How We Use Claude

Based on thkt's usage over the last 30 days (846 sessions):

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
- [ ] dotclaude - github.com/thkt/dotclaude (Claude Code config: agents, skills, hooks, rules)
- [ ] yomu - ~/GitHub/cli/yomu (semantic code search CLI)
- [ ] scout - ~/GitHub/cli/scout (web fetch / search CLI)
- [ ] recall - ~/GitHub/cli/recall (session search)
- [ ] shields - ~/GitHub/cli/shields (PreToolUse guard hook)
- [ ] guardrails - ~/GitHub/cli/guardrails (lint hook)
- [ ] kiku - ~/GitHub/cli/kiku (Slack semantic search)
- [ ] kagami - ~/GitHub/apps/kagami (session tracking app)
- [ ] tally - ~/GitHub/cli/tally (engineering time tracking)

### MCP Servers to Activate
- [ ] heptabase - Knowledge base / note cards. Get access at heptabase.com; configure API key via `/mcp`.
- [ ] discord - Discord bot integration for async Claude responses. Run `/discord:configure` to set up your bot token.
- [ ] context7 - Library documentation lookup. Enable via `/plugin` from the marketplace.

### Skills to Know About
- `/commit` - Generates a Conventional Commits message from staged diff. Run after edits instead of writing commit messages manually.
- `/audit` - Orchestrates multiple specialized reviewers (security, type safety, silent failures, etc.) against the current codebase.
- `/challenge` - Devil's advocate pass on a proposal, design, or plan. Use before committing to an architecture decision.
- `/think` - Design exploration that produces SOW + Spec documents. Entry point for any non-trivial new feature.
- `/polish` - Light review + cleanup pass. Use after a feature lands to catch slop before the next PR.
- `/release-notes` - Surfaces the latest Claude Code changelog and flags anything relevant to the current environment.
- `/plugin` - Lists installed plugins; use to enable/disable marketplace entries.
- `/compact` - Summarizes and compresses context when usage approaches 70%. Run proactively on long sessions.
- `/code` - TDD/RGRC implementation loop with real-time test feedback.

## Team Tips

_TODO_

## Get Started

_TODO_

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy - warm, conversational,
not lecture-y.

Open with a warm welcome - include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes - [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections - offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data - don't extrapolate them into a "team
workflow" narrative. -->
