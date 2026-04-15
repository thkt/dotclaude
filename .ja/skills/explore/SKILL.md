---
name: explore
description: yomu のインデックスDBに対して反復SQLクエリでコードベース構造を探索。
  どこで使われてる, どのファイルが依存してる, 呼び出し元を教えて, 参照してるファイル,
  importしてるところ, 循環依存, 依存チェーン, who calls, what depends on,
  which files use, callers, callees 等の構造的・関係的な質問に使用。
  概念・意味的な検索には使わない（yomu search を使うこと）。
allowed-tools: Bash(sqlite3:*), Bash(git:*)
argument-hint: "[コードベース構造に関する自然言語の質問]"
user-invocable: true
---

## セットアップ

1. プロジェクトルートを特定: `git rev-parse --show-toplevel`
2. DBパス: `<root>/.yomu/index.db`
3. DBが存在しない場合 → `yomu harvest` を実行するようユーザーに伝える

## スキーマ

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
  source_file TEXT,  -- シンボルを使用するファイル
  target_file TEXT,  -- シンボルを定義するファイル
  symbol_name TEXT
)

file_context (file_path TEXT PRIMARY KEY, imports_text TEXT)

-- FTS5: rowid = id でchunksとJOIN
fts_chunks (name, content, file_path)
-- SELECT c.* FROM fts_chunks f JOIN chunks c ON f.rowid = c.id WHERE fts_chunks MATCH 'keyword'
```

`vec_chunks` はクエリしない（sqlite-vec拡張が必要）。

## 探索

`sqlite3 <db_path> "<query>"` を反復実行。前のクエリ結果に基づいて次のクエリを適用させる。

## 出力

- エビデンスとしてファイルパスと行番号を記載（`file_path:line`）
- 信頼度マーカー:[✓]直接確認済 /[→]データから推論
