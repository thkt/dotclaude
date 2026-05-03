---
name: explore
description: Explore codebase structure via iterative SQL queries against yomu's indexed SQLite DB. Do NOT use for concept/semantic search (use use-cli-yomu) or literal string search (use ugrep).
when_to_use: どこで使われてる, どのファイルが依存してる, 呼び出し元, 参照してるファイル, import元, 循環依存, 依存チェーン, who calls, what depends on, which files use, callers, callees, dependency chain, files importing a symbol
allowed-tools: Bash(sqlite3:*) Bash(git:*) Bash(yomu:*)
argument-hint: "[natural language question about codebase structure]"
---

# explore

## Prerequisite

Run `yomu status` first and read the counts.

| State             | Action                                                               |
| ----------------- | -------------------------------------------------------------------- |
| Index missing     | Tell user to run `yomu rebuild` (full), then re-invoke               |
| Stale after edits | Tell user to run `yomu index` (incremental), then re-invoke          |
| References: 0     | caller/import 系クエリは空。`use-cli-yomu` か ugrep にフォールバック |

DB path: `<project_root>/.yomu/index.db` (`git rev-parse --show-toplevel`). If not a git repo, ask user for the DB path.

## Schema

Run queries via `sqlite3 -readonly <db_path> "<query>"`.

```sql
chunks (
  id INTEGER PRIMARY KEY,
  file_path TEXT NOT NULL,
  chunk_type TEXT NOT NULL,   -- e.g. rust_fn, rust_struct, rust_impl, rust_trait, rust_enum, md_section, other. Language-dependent.
  name TEXT,                  -- nullable
  content TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  file_hash TEXT NOT NULL,
  parent_chunk_id INTEGER REFERENCES chunks(id)
)

file_references (
  id INTEGER PRIMARY KEY,
  source_file TEXT NOT NULL,  -- symbol を使う側
  target_file TEXT NOT NULL,  -- symbol を定義する側
  symbol_name TEXT,           -- nullable
  ref_kind TEXT NOT NULL      -- e.g. named
)

file_context (file_path TEXT PRIMARY KEY, imports_text TEXT)

-- FTS5 external content. rowid = chunks.id で JOIN
fts_chunks (name, content, file_path)
```

Do not query `vec_chunks` (requires sqlite-vec extension; semantic search belongs to `yomu search`).

## When to Use

| Question                                           | Tool                       |
| -------------------------------------------------- | -------------------------- |
| Symbol X はどのファイルで使われてる？              | explore (file_references)  |
| File X の依存を網羅したい                          | `yomu impact <file>`       |
| File X の依存を ref_kind 別に集計・JOIN したい     | explore (ad-hoc SQL)       |
| 概念「認証フロー」で関連コードを探す               | use-cli-yomu (semantic)    |
| リテラル文字列 / 正規表現で grep                   | ugrep                      |
| chunks の content にキーワードが含まれるか全文検索 | explore (fts_chunks MATCH) |

## Query Archetypes

Start from an archetype → refine based on previous results. Do not hardcode today's only enum value (e.g. `ref_kind='named'` will expand).

### 1. Caller lookup (who uses this symbol)

```sql
SELECT source_file, ref_kind, COUNT(*) AS uses
FROM file_references
WHERE symbol_name = 'TargetSymbol'
GROUP BY source_file, ref_kind
ORDER BY uses DESC;
```

### 2. Import chain (what a file imports)

```sql
SELECT file_path, imports_text
FROM file_context
WHERE imports_text LIKE '%target_module%';
```

### 3. Keyword FTS (where keyword appears in code content)

```sql
SELECT c.file_path, c.start_line, c.name, c.chunk_type
FROM fts_chunks f
JOIN chunks c ON f.rowid = c.id
WHERE fts_chunks MATCH 'keyword'
LIMIT 20;
```

## Output

- Lead with the direct answer (file list, count, chain)
- Cite `file_path:line` for every claim
- State the basis for each claim: direct row from query result for facts, "inferred by JOIN / aggregation / naming" for inferences

Example:

```
TargetSymbol を使うファイルは 3 件 (direct query result)
  src/handlers/user.rs:42
  src/handlers/admin.rs:18
  src/tests/integration.rs:205

ref_kind は 'named' のみ (inferred from aggregation): import vs call の区別は不明
```
