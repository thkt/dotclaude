---
name: reflect
description: 現在のセッションの暫定 reflection (realization / judgment / counterfactual) を提示し、必要に応じて durable な knowledge store へ昇格する。Stop hook の reflection 抽出が失敗したときの escape hatch。
allowed-tools: Read Write Bash
---

# /reflect - 手動 reflection 昇格

自動 reflection パイプラインの escape hatch。通常は Stop hook の subagent 抽出 (`reflection-extract.sh`) がセッションごとの reflection を自動で書き出す。そのパイプラインが失敗したとき (subagent timeout、API エラー、build 問題)、`/reflect` を使えばセッション終了前に同じ成果物を手動で生成できる。

これは primary path ではない。primary は Stop hook。次のいずれかの場合にこの skill を使う。

- 最新の `knowledge/reflection/<session_id>.md` が `placeholder: true` ファイル (自動抽出が空を返した) で、残す価値のある reflection があるとき。
- 次のセッションが読む前に、自動抽出された内容を上書きまたは編集したいとき。
- このマシンで Stop hook が壊れている疑いがあり、knowledge store が最新に保たれているか検証したいとき。

## 手順

### Step 0: パス解決

skill の冒頭で 1 回実行する。

```bash
KDIR="${REFLECT_KNOWLEDGE_DIR:-${CLAUDE_PROJECT_DIR}/.claude/knowledge}"
SID="${CLAUDE_SESSION_ID:?session id required}"
MD="$KDIR/reflection/$SID.md"
INDEX="$KDIR/reflection-index.jsonl"
```

`$KDIR` が存在しない場合は、Stop hook の下でセッションを少なくとも 1 回実行する (ディレクトリは初回の自動抽出で作成される) か、`REFLECT_KNOWLEDGE_DIR` を明示的に設定するようユーザーに伝える。

### Step 1: 現状の読み取り

以下をこの順でユーザーに表示する。

1. `$MD` は存在するか。あれば表示する (frontmatter + body)。
2. placeholder (`placeholder: true`) か。該当すればフラグする。
3. `$INDEX` の最新 3 エントリ (ユーザーがローカル履歴を確認できるように)。

### Step 2: 生成

3 カテゴリにわたる新しい reflection を生成する。`agents/reflection-extractor.md` と同じ形を使い、そのガイダンス (realization / judgment / counterfactual) を再利用する。body は合計 300 words 以内に収める。出力の frontmatter は次を使う。

```
---
session_id: <SID>
confidence: confirmed   # always "confirmed" for /reflect — user-attested
categories: [...]
word_count: <int>
created_at: <ISO8601 UTC>
promoted_via: reflect-skill
---
```

`promoted_via: reflect-skill` フィールドは手動昇格の印で、監査が自動抽出された reflection と区別できるようにする。

### Step 3: 確認

生成した reflection を fenced block でユーザーに見せ、「`$MD` へ昇格する? (yes / edit / cancel)」と問う。

- `yes` → Step 4
- `edit` → 変更点を尋ね、再生成して Step 3 に戻る
- `cancel` → 書き込まずに終了

### Step 4: 書き込みと index 追記

```bash
# Atomic write: stage to a temp file, then move.
TMP="$(mktemp "$KDIR/reflection/.$SID.XXXXXX")"
cat > "$TMP" <<EOF
<composed reflection>
EOF
mv "$TMP" "$MD"

# Index: append if this session has no prior entry, otherwise skip
# (append-only contract; duplicates are tolerated but noisy).
if ! grep -Fq "\"session_id\":\"$SID\"" "$INDEX" 2>/dev/null; then
  printf '{"session_id":"%s","reflection_file":"%s","created_at":"%s","promoted_via":"reflect-skill"}\n' \
    "$SID" "$MD" "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" >> "$INDEX"
fi

echo "Promoted to $MD"
```

## 制約

- `CLAUDE.md`、`MEMORY.md`、`rules/`、`agents/`、`skills/`、および `paths:` frontmatter で参照されるファイルを変更しない。Stop hook と同じ auto-loaded-path 不変ルール。違反すると以降のすべてのセッションで prompt cache が無効化される。
- 現在のセッション以外の transcript を読まない。
- `claude --bare` を再帰的に呼ばない。この skill は subagent ではなくメインセッションで動く。

## 使わないとき

- Stop hook が動作していて、最新の reflection が `confidence: confirmed` (placeholder ではない) のとき。`/reflect` の再実行は、より品質の高い抽出を上書きしてしまう。
- 古いセッションの reflection を編集したいとき。それは `$KDIR/reflection/<old-sid>.md` の手動編集であり、この skill の対象外。
- エントリを削除したいとき。index は契約上 append-only で、削除はこの skill の外の別操作。

## 関連

| File                                    | Relation                                     |
| --------------------------------------- | -------------------------------------------- |
| `agents/reflection-extractor.md`        | 3 カテゴリの出力の形を共有する               |
| `hooks/lifecycle/reflection-extract.sh` | この skill が補完する primary の自動抽出パス |
