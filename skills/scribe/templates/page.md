# Wiki page template

/scribe writes with this skeleton when creating / promoting a page in Phase 5. One pattern per page, with a kebab-case filename `<共通項名>.md`. Replace `<...>` at generation time.

## Template

Each page is structured in the order 内容 → 定型手順 → 参照コード → 根拠. In 参照コード, write the current-code locations verified in Phase 4 as `path` + symbol name (function / type / heading), with no line numbers. Transcribe a code excerpt only when the shape of the pattern itself is the point, up to a few lines. In 根拠, write the PR/issue numbers of the original discussions.

```markdown
# <共通項名>

## 内容

何をする/しないかの言語化（1〜3 文）。

## 定型手順

繰り返す手順・チェックリスト（あれば）。

## 参照コード

- `path/to/file` の `シンボル名`（何が読めるか1行）

## 根拠

- #12 何があったか1行
- #34 何があったか1行
```
