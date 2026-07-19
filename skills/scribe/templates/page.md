# Wiki page template

/scribe writes with this skeleton when creating / promoting a page in Phase 5. One pattern per page, with a kebab-case filename `<共通項名>.md`. Replace `<...>` at generation time.

## Template

Each page is structured in the order 内容 → 定型手順 → 根拠. Readers use the content and the procedure; the evidence is a footnote of provenance. Attach both the PR/issue numbers of the original discussions and the verified location in the current code, so readers can trace why the convention exists and where it holds today.

```markdown
# <共通項名>

## 内容

何をする/しないかの言語化（1〜3文）。

## 定型手順

繰り返す手順・チェックリスト（あれば）。

## 根拠

- #12 何があったか1行
- #34 何があったか1行
- 現行コード: `path/to/file:行`（検証済みの成立根拠）
```
