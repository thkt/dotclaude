---
name: explore
description: Explore codebase structure via iterative SQL queries against yomu's
  indexed DB. Use when user asks structural/relational questions like — どこで使われてる,
  どのファイルが依存してる, 呼び出し元を教えて, 参照してるファイル, importしてるところ,
  循環依存, 依存チェーン, who calls, what depends on, which files use, callers,
  callees, dependency chain, files importing a symbol. NOT for concept/semantic
  search (use yomu search instead).
allowed-tools: Bash(sqlite3:*), Bash(git:*)
argument-hint: "[natural language question about codebase structure]"
user-invocable: true
---

## Setup

1. Find project root: `git rev-parse --show-toplevel`
2. DB path: `<root>/.yomu/index.db`
3. If DB missing → tell user to run `yomu harvest` first

## Schema

```sql
chunks (
  id INTEGER PRIMARY KEY,
  file_path TEXT,
  chunk_type TEXT,   -- rust_fn, rust_struct, rust_enum, rust_impl, rust_trait, md_section, other
  name TEXT,         -- nullable
  content TEXT,
  start_line INTEGER,
  end_line INTEGER,
  parent_chunk_id INTEGER
)

file_references (
  source_file TEXT,  -- file that uses the symbol
  target_file TEXT,  -- file that defines the symbol
  symbol_name TEXT
)

file_context (file_path TEXT PRIMARY KEY, imports_text TEXT)

-- FTS5: join via rowid = id
fts_chunks (name, content, file_path)
-- SELECT c.* FROM fts_chunks f JOIN chunks c ON f.rowid = c.id WHERE fts_chunks MATCH 'keyword'
```

Do not query `vec_chunks` (requires sqlite-vec extension).

## Exploration

Run `sqlite3 <db_path> "<query>"` iteratively. Adapt each query based on previous results.

## Output

- File paths and line numbers as evidence (`file_path:line`)
- Confidence marker:[✓]directly confirmed /[→]inferred from data
