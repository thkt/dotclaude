# Research: antigravity-cli-google-ai-studio

Generated: 2026-09-14
Session: 02d5ccd9-0826-47fa-9708-b7951428cbfd
Intent: Understanding
Domain: Infrastructure
Prior research: none found

## Purpose

Antigravity CLI (`agy`) を Google AI Studio で発行した Gemini API key で動かす手順と、その経路に切り替えたときに何を失うかを確定させる。

## Answer (手順)

このマシンには `agy` 1.2.2 が `/opt/homebrew/bin/agy` に入っており、この機能は 1.1.13 で入っているので追加インストールは要らない。

1. Google AI Studio (https://aistudio.google.com/app/api-keys) で API key を作る
2. `~/.gemini/antigravity-cli/settings.json` に `"modelProvider": "gemini"` を**マージする**。ファイルを置き換えると既存の `statusLine`/`trustedWorkspaces` が消える
3. `export GEMINI_API_KEY="<key>"` をシェルに設定する。`~/.zshrc` に書けば次回以降も残る
4. `agy` を起動する。サインイン画面を飛ばしてヘッダに `Gemini API key` と出る
5. 戻すときは `settings.json` から `modelProvider` を消す。key だけ消して `modelProvider` を残すと CLI は起動しない

## Key Findings

| Priority | Finding                                                                                                                                                                                                                                                                                                                                                                                                          | Source                                                                                                                                                                             | Next Action                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Antigravity CLI は `modelProvider: "gemini"` + `GEMINI_API_KEY` で AI Studio の key を使って動く。`GEMINI_API_KEY` だけを設定しても効かない                                                                                                                                                                                                                                                                      | https://antigravity.google/docs/cli/install/ § Using a Gemini API key                                                                                                              | 質問への直接回答。上の Answer 手順を実行する                                                                                                       |
| High     | 機能は `agy` 1.1.13 で追加済み。インストール済みは 1.2.2 なので利用可能                                                                                                                                                                                                                                                                                                                                          | `strings /opt/homebrew/bin/agy` の changelog `## 1.1.13` 行、`agy --version` = 1.2.2                                                                                               | 質問への直接回答。バージョン条件は満たしている                                                                                                     |
| High     | `modelProvider: gemini` に切り替えると third-party モデルが選択肢から消える。account auth では `claude-sonnet-4-6` / `claude-opus-4-6-thinking` / `gpt-oss-120b-medium` が出るが、gemini provider では Gemini 系 11 件だけになる。effort 接尾辞 (`-high` / `-medium` / `-low`) は残る                                                                                                                            | `agy models` を両 provider で実行した差分 (本セッション実測、Disconfirmation Check に全文)                                                                                         | 質問への直接回答。Claude / GPT-OSS 視点が要る用途では account auth を残す                                                                          |
| High     | `docs/plans` の「BYOK は非対応」と `docs/cli/install` の手順は矛盾しない。`docs/plans` の否定は "Bring-your-own-key or bring-your-own-endpoint **for additional rate limits**" と限定されており、Antigravity プラン側の quota を key で増やせないことを指す。`modelProvider: gemini` は Antigravity backend を経由せず Gemini API の直接クライアントになる別経路で、quota も課金も AI Studio の project 側に乗る | https://antigravity.google/docs/plansとhttps://antigravity.google/docs/cli/install/を同日取得して対照                                                                           | record only                                                                                                                                        |
| High     | AI Studio の無償枠 (Unpaid Services) に送った内容は Google が製品改善に使い、human reviewer が読む場合がある。billing を紐付けた project 経由なら Paid Services 扱いになり学習利用されない                                                                                                                                                                                                                       | https://ai.google.dev/gemini-api/terms § Unpaid Services / Paid Services                                                                                                           | 質問への直接回答。`/Users/thkt/.claude` (harness 一式) を食わせる用途なので、無償枠のまま使うか billing を付けるかを先に決める                     |
| Medium   | `agy` は Claude Code の Bash sandbox 内で起動できない。`127.0.0.1` への bind と `~/.gemini/antigravity-cli/log/` への書き込みが `operation not permitted` で落ちる。`settings.json:50` は `Bash(agy *)` を許可済みなので、workflow から `agy` を呼ぶと必ずこれを踏む                                                                                                                                             | `agy models` を sandbox 内で実行 → `listen tcp 127.0.0.1:0: bind: operation not permitted`。`dangerouslyDisableSandbox: true` で同じコマンドが成功                                 | OUTCOME Behavior「harness が定めた品質ゲートを裁量で迂回できない」に関わる。`agy` を harness に戻すなら sandbox 例外か別経路の判断が要る           |
| Medium   | DR-0079 は Antigravity を polish から外した理由を quota 枯渇と記録し、Reassessment Trigger に「Antigravity の quota が改善した場合、外部 source への再投入を再判断」と書いている。AI Studio key 経路は使用量を account quota から支払い可能な project quota へ移すので、この trigger の判定条件が変わった可能性がある                                                                                            | `docs/decisions/0079-purify-polish-to-external-cli-cleanup-and-fix-audit-boundary.md:15,22,86`                                                                                     | OUTCOME Behavior (品質ゲートの決定論化) に紐づく。DR-0079 の Reassessment Trigger を再判定する。再投入の可否そのものは本レポートの決定事項ではない |
| Medium   | key は `GEMINI_API_KEY` の環境変数からしか読まれない。`GOOGLE_API_KEY` や `.env` ファイルは効かない                                                                                                                                                                                                                                                                                                              | https://antigravity.google/docs/cli/install/の troubleshooting 表、および `strings /opt/homebrew/bin/agy` が `GEMINI_API_KEY` を名指しするエラー文字列のみを持つこと (2 手法一致) | record only                                                                                                                                        |
| Medium   | 起動時チェックは key が空でないことだけ。無効な key は最初の会話で初めて失敗する                                                                                                                                                                                                                                                                                                                                 | https://antigravity.google/docs/cli/install/ troubleshooting 表。dummy key で `agy models` が通ったことと整合                                                                      | record only                                                                                                                                        |
| Medium   | `settings.json` から `modelProvider` を残したまま `GEMINI_API_KEY` を消すと CLI は起動せず、復旧手順を含むエラーで終了する                                                                                                                                                                                                                                                                                       | 本セッション実測 (Disconfirmation Check に全文)                                                                                                                                    | record only                                                                                                                                        |
| Low      | `GOOGLE_GEMINI_BASE_URL` で Gemini 互換の別エンドポイントへ向けられる                                                                                                                                                                                                                                                                                                                                            | https://antigravity.google/docs/cli/install/ § Point the CLI to a custom endpoint                                                                                                  | record only                                                                                                                                        |
| Low      | Gemini API の rate limit はドキュメントの静的表から AI Studio の画面 (https://aistudio.google.com/rate-limit) へ移っており、無償枠の RPM / TPM / RPD の具体値はドキュメントから読めない                                                                                                                                                                                                                          | https://ai.google.dev/gemini-api/docs/rate-limits § Gemini API rate limits                                                                                                         | record only                                                                                                                                        |
| Low      | rate limit は API key 単位ではなく project 単位。RPD は太平洋時間の深夜にリセット                                                                                                                                                                                                                                                                                                                                | https://ai.google.dev/gemini-api/docs/rate-limits § How rate limits work                                                                                                           | record only                                                                                                                                        |
| Low      | 2026-06-21 のコミュニティ回答は「AI Studio の key を Antigravity CLI / IDE で使う方法はない」と答えているが、CLI については現行ドキュメントと binary changelog に追い越されている                                                                                                                                                                                                                                | https://discuss.ai.google.dev/t/how-to-use-api-key-with-antigravity/172100                                                                                                         | record only                                                                                                                                        |

## Available Data

| Type   | Item                                                                 | Note                                                                          |
| ------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Env    | `/opt/homebrew/bin/agy` 1.2.2                                        | Mach-O arm64。Homebrew の PATH 上                                             |
| Config | `~/.gemini/antigravity-cli/settings.json`                            | 現在 `statusLine` と `trustedWorkspaces` のみ。`modelProvider` は未設定       |
| Env    | `GEMINI_API_KEY` / `GOOGLE_API_KEY`                                  | 現在どちらも未設定                                                            |
| Config | `/Users/thkt/.claude/settings.json:50`                               | `Bash(agy *)` を許可済み                                                      |
| Tech   | `agy -p` / `--output-format json` / `--dangerously-skip-permissions` | headless 実行向けフラグが揃っている                                           |
| File   | `docs/decisions/0079-...md`                                          | Antigravity を polish から外した DR。Reassessment Trigger に quota 改善が入る |

## Constraints

| Category             | Constraint                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| OUTCOME (Non-goal)   | harness を他メンバーのマシンへ配布しない。本件の設定は thkt のマシン固有でよい                                   |
| OUTCOME (Constraint) | Claude Code の hook / skill / plugin 仕様の範囲内。`agy` を呼ぶなら外部 CLI として呼ぶ                           |
| 発見                 | `agy` は Bash sandbox 内で起動できない (localhost bind と log 書き込みが拒否される)                              |
| 発見                 | AI Studio 無償枠は Google の学習対象。harness 全体を読ませるなら billing 紐付けで Paid Services にする必要がある |
| 発見                 | gemini provider では Claude / GPT-OSS モデルが選べない。cross-family の視点は account auth 側にしか無い          |

## Disconfirmation Check

Phase 5 は未実行 (Intent = Understanding)。scratch から逐語引用する。

反証の対象は「`modelProvider` を設定せず `GEMINI_API_KEY` だけで動くのではないか」「gemini provider でも third-party モデルは残るのではないか」の 2 点。

コマンド 1 — `modelProvider: gemini` かつ key なし (settings は実行後に復元済み):

```
$ env -u GEMINI_API_KEY agy -p "hi"
modelProvider is set to "gemini" in settings.json, but the GEMINI_API_KEY environment variable is not set. Set GEMINI_API_KEY to your Gemini API key, or remove "modelProvider" from settings.json to use the default backend.
```

コマンド 2 — account auth (`modelProvider` なし) の `agy models`:

```
$ agy models
Fetching available models...
gemini-3.8-flash-high	Gemini 3.8 Flash (High)
gemini-3.8-flash-medium	Gemini 3.8 Flash (Medium)
gemini-3.8-flash-low	Gemini 3.8 Flash (Low)
gemini-3.7-flash-high	Gemini 3.7 Flash (High)
gemini-3.7-flash-medium	Gemini 3.7 Flash (Medium)
gemini-3.7-flash-low	Gemini 3.7 Flash (Low)
gemini-3.6-flash-high	Gemini 3.6 Flash (High)
gemini-3.6-flash-medium	Gemini 3.6 Flash (Medium)
gemini-3.6-flash-low	Gemini 3.6 Flash (Low)
gemini-3.1-pro-high	Gemini 3.1 Pro (High)
gemini-3.1-pro-low	Gemini 3.1 Pro (Low)
claude-sonnet-4-6	Claude Sonnet 4.6 (Thinking)
claude-opus-4-6-thinking	Claude Opus 4.6 (Thinking)
gpt-oss-120b-medium	GPT-OSS 120B (Medium)
```

コマンド 3 — `modelProvider: gemini` かつ非空の dummy key (settings は実行後に復元済み):

```
$ GEMINI_API_KEY="dummy-invalid-key-for-probe" agy models
Fetching available models...
gemini-3.8-flash-high	Gemini 3.8 Flash (High)
gemini-3.8-flash-medium	Gemini 3.8 Flash (Medium)
gemini-3.8-flash-low	Gemini 3.8 Flash (Low)
gemini-3.7-flash-high	Gemini 3.7 Flash (High)
gemini-3.7-flash-medium	Gemini 3.7 Flash (Medium)
gemini-3.7-flash-low	Gemini 3.7 Flash (Low)
gemini-3.6-flash-high	Gemini 3.6 Flash (High)
gemini-3.6-flash-medium	Gemini 3.6 Flash (Medium)
gemini-3.6-flash-low	Gemini 3.6 Flash (Low)
gemini-3.1-pro-high	Gemini 3.1 Pro (High)
gemini-3.1-pro-low	Gemini 3.1 Pro (Low)
```

コマンド 2 と 3 の差は `claude-sonnet-4-6`/`claude-opus-4-6-thinking`/`gpt-oss-120b-medium` の 3 件。effort 接尾辞は両方に残る。0 件ヒットではなく件数差なので、クエリ形状の誤りではない。

`GEMINI_API_KEY` 単独では効かないという主張は、公式 troubleshooting 表と binary の文字列の 2 手法で一致した。`strings /opt/homebrew/bin/agy` に現れる key 名は `GEMINI_API_KEY` のみで、`GOOGLE_API_KEY` を読む経路の文字列は無い。

実行後、`~/.gemini/antigravity-cli/settings.json` は元の内容 (`statusLine` + `trustedWorkspaces`) に復元済み。

## References

| Path                                                                                  | Description                                                                   |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| https://antigravity.google/docs/cli/install/                                          | 一次情報。`modelProvider` + `GEMINI_API_KEY` の手順と troubleshooting 表      |
| https://antigravity.google/docs/plans                                                 | BYOK の否定文が "for additional rate limits" に限定されていることの一次情報   |
| https://ai.google.dev/gemini-api/terms                                                | 無償枠 / 有償枠のデータ取り扱いの一次情報                                     |
| https://ai.google.dev/gemini-api/docs/rate-limits                                     | rate limit が project 単位であること、具体値が AI Studio 画面へ移ったこと     |
| https://aistudio.google.com/app/api-keys                                              | key 発行先                                                                    |
| https://github.com/google-antigravity/antigravity-cli/issues/78                       | headless 向け API key 対応の要望 issue (2026-05-21)                           |
| https://discuss.ai.google.dev/t/how-to-use-api-key-with-antigravity/172100            | 2026-06-21 の「非対応」回答。CLI については現行ドキュメントに追い越されている |
| `docs/decisions/0079-purify-polish-to-external-cli-cleanup-and-fix-audit-boundary.md` | Antigravity を polish から外した DR と Reassessment Trigger                   |
| `.claude/workspace/research/agent-friendly-cli-audit.md`                              | slug 語の重なり 1 語のみ。内容の継承は無い                                    |

## Coverage Notes

- 有効な key で会話が最後まで通るかは未検証。`unknown, requires 有効な AI Studio key`。検証方法は key を発行して `agy -p "hi"` を 1 回流す。verification.md に従い、この未検証項目を Next Action の前提にも Disconfirmation の根拠にもしていない
- gemini provider で `agy models` が返す一覧が network 由来かローカルの静的一覧かは未分離。`unknown, requires 有効な key での再実行と通信の観察`。ただし provider による件数差は dummy key でも再現するため、選択肢が絞られること自体は確定
- 無償枠の RPM/TPM/RPD の具体値は未取得。`unknown, requires サインインして https://aistudio.google.com/rate-limit を開く`
- Antigravity **IDE** 側で AI Studio key が使えるかは未検証。`unknown, requires IDE 側ドキュメントの確認`。本レポートの手順は CLI (`agy`) のみを対象とする
- ツール間の不一致は無し。`GEMINI_API_KEY` 単独無効の主張は公式表と binary 文字列で一致
- Advisor: 呼び出し済み。`docs/plans` と `docs/cli/install` の矛盾を未解決のまま出さず限定解釈として確定させること、sandbox 失敗と settings.json のマージ要件を finding として立てること、DR-0079 の Reassessment Trigger を Next Action に載せること、dummy key での `agy models` 実行を指摘された。すべて反映済み

## Next Steps

| Intent             | Next Command |
| ------------------ | ------------ |
| Understanding only | complete     |
