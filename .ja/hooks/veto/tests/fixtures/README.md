# hook-payloads fixtures

`gate-hook.bats` は実物の Claude Code hook payload を出荷スクリプトに通す。これらの fixture は、そのスクリプトが stdin で受け取る payload の形そのもの。

## 出自

実際の PreToolUse / PostToolUse イベントの実キャプチャ (session `38b8fba4`, 2026-07) から導出し、`gen_fixtures.py` で sanitize + 再生成している。

- `session_id` -> `SESSION-FIXTURE`、`cwd` -> `/repo`、`prompt_id` -> `PROMPT-FIXTURE`
- probe / task の内容 -> テスト用 issue タイトル `[Feature] ゲート付き issue 作成フロー`

## Wire-format との一致

fixture は compact な single-line JSON で出力する。Claude Code が stdin に届ける形と一致させるため。`pre-issue-create.sh` は空白なしの `"tool_name":"Bash"` を match するので、pretty-print した fixture (`": "` が入る) は本番と静かに乖離する。手編集せず必ず再生成する。

```
python3 gen_fixtures.py ./hook-payloads
```

## Payload 一覧

| File                           | Event                       | テストでの役割                                              |
| ------------------------------ | --------------------------- | ----------------------------------------------------------- |
| `bash-verdict-go.json`         | PostToolUse Bash            | GO を返す `veto.py verdict-gate` 実行                       |
| `bash-plan-ready.json`         | PostToolUse Bash            | ready を返す `veto.py plan-gate` 実行                       |
| `bash-research-done.json`      | PostToolUse Bash            | research 完了を宣言する `veto.py research-gate` 実行        |
| `bash-gh-create-success.json`  | PostToolUse Bash            | 成功した `gh issue create` (stdout に issue URL) -> 消費    |
| `pre-gh-create-main.json`      | PreToolUse Bash             | gate への入力、main agent                                   |
| `pre-gh-create-subagent.json`  | PreToolUse Bash             | subagent 発 (`agent_id`) -> exemption 経路                  |
| `pre-gh-create-mismatch.json`  | PreToolUse Bash             | 似て非なる title -> title 不一致 deny                       |
| `pre-bash-nonmatching.json`    | PreToolUse Bash             | gh 以外のコマンド -> fast-exit                              |
| `askuserquestion-skip.json`    | PostToolUse AskUserQuestion | 固定 `判定スキップ` header -> skip record                   |
| `askuserquestion-nonskip.json` | PostToolUse AskUserQuestion | 別 header -> 記録しない                                     |
