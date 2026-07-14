# Plan テンプレート

`/think` が Phase 3 の下書き `.claude/workspace/planning/YYYY-MM-DD-<slug>.plan.md` をこの骨格で生成する。`/issue` は両節をそのまま issue 本文へ移設するため、この骨格がそのまま issue の Plan 節になる。

## テンプレート

`{...}` は生成時に内容へ置き換える。下書きは次の 2 節だけで構成し、見出しと箇条書きの形を崩さない。build workflow は Plan 節を LLM 抽出で build.js の EXTRACT_SCHEMA に写し、U-NNN / T-NNN id の決定論クロスチェックで欠落と捏造を止めるため、抽出の安定は骨格の安定が担う。機械用の隠し block は置かない。

```markdown
## Plan

Outcome: {done 状態の 1 行。実装非依存、観測可能}
test_command: {テスト実行コマンド 1 行。例 cargo test / node --test tests/}

### 前提

- {既存依存。path 単独か path + stable anchor: `src/storage/mod.rs` の `open_db`}

### U-001 {unit タイトル}

{goal の言い切り 1 行。この unit が届ける振る舞い}

- files: {`src/foo.rs`, `tests/foo.test.rs`}
- contract: {引用 1 行 + やりたいこと 1 行}

受け入れテスト。

- T-001 {条件と期待結果を 1 行で言い切る言明。テスト名になる}

## Backlog candidates

- {スコープ外に切り出す候補。1 件 1 行}
```

## ガイドライン

id は U-NNN / T-NNN とも 001 からの連番。T-NNN は plan 全体で一意とし、unit ごとに振り直さない。unit は実装順に並べ、並び順がそのまま実装順になる。各 field の上限は骨格に示した行数で、超過は文章の追加でなく分割で解消する。unit を割るか、backlog へ切り出す。受け入れテストは振る舞いを固定する unit に書く。検証可能な振る舞いが無い unit (docs / 設定) は「受け入れテスト。」の段落ごと省略し、build はその unit を Red → Green でなく直接実装で扱う。

| フィールド | OK                                                 | NG                                   |
| ---------- | -------------------------------------------------- | ------------------------------------ |
| Outcome    | 検索結果が 1 秒以内に表示される                    | 検索を高速化する (観測不能)          |
| 前提       | `src/config.rs` の `load_config`                   | src/config.rs 内の実装詳細コメント   |
| contract   | `src/query.rs` の `search` に倣い limit 引数を足す | 新規シグネチャのコード片を書き下ろす |
| T-NNN      | 空クエリはエラーを返す                             | 正しく動くことを確認する             |
