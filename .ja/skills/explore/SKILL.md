---
name: explore
description: yomu がインデックス化した SQLite DB に対する反復 SQL クエリでコードベース構造を探索する。概念やセマンティック検索には使わない (use-cli-yomu を使う)。リテラル文字列検索にも使わない (Grep を使う)。
when_to_use: どこで使われてる, どのファイルが依存してる, 呼び出し元, 参照してるファイル, import元, 循環依存, 依存チェーン, who calls, what depends on, which files use, callers, callees, dependency chain, files importing a symbol
allowed-tools: Bash(sqlite3:*) Bash(git:*) Bash(yomu:*)
argument-hint: "[natural language question about codebase structure]"
---

# explore

## 前提条件

最初に `yomu status` を実行し、件数を読む。

| 状態           | 動作                                                                |
| -------------- | ------------------------------------------------------------------- |
| Index missing  | `yomu rebuild` (full) を促してから再度呼び出す                      |
| 編集後で stale | `yomu index` (incremental) を促してから再度呼び出す                 |
| References: 0  | caller/import 系クエリは空。`use-cli-yomu` か Grep にフォールバック |

DB パス: `<project_root>/.yomu/index.db` (`git rev-parse --show-toplevel`)。Git リポジトリでない場合はユーザーに DB パスを尋ねる。

## スキーマ

クエリは `sqlite3 -readonly <db_path> "<query>"` で実行する。

```sql
chunks (
  id INTEGER PRIMARY KEY,
  file_path TEXT NOT NULL,
  chunk_type TEXT NOT NULL,   -- e.g. rust_fn, rust_struct, rust_impl, rust_trait, rust_enum, md_section, other. 言語依存
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

`vec_chunks` はクエリしない (sqlite-vec 拡張が必要。セマンティック検索は `yomu search` の責務)。

## 使い分け

| 質問                                               | ツール                     |
| -------------------------------------------------- | -------------------------- |
| Symbol X はどのファイルで使われてる？              | explore (file_references)  |
| File X の依存を網羅したい                          | `yomu impact <file>`       |
| File X の依存を ref_kind 別に集計・JOIN したい     | explore (ad-hoc SQL)       |
| 概念「認証フロー」で関連コードを探す               | use-cli-yomu (semantic)    |
| リテラル文字列 / 正規表現で grep                   | Grep                       |
| chunks の content にキーワードが含まれるか全文検索 | explore (fts_chunks MATCH) |

## クエリの定型

定型から始めて、前回結果に応じて refine する。今日時点で唯一の enum 値をハードコードしない (例: `ref_kind='named'` は今後拡張される)。

### 1. 呼び出し元探索 (この symbol を使うのは誰)

```sql
SELECT source_file, ref_kind, COUNT(*) AS uses
FROM file_references
WHERE symbol_name = 'TargetSymbol'
GROUP BY source_file, ref_kind
ORDER BY uses DESC;
```

### 2. import チェーン (ファイルが import するもの)

```sql
SELECT file_path, imports_text
FROM file_context
WHERE imports_text LIKE '%target_module%';
```

### 3. キーワード FTS (キーワードがコード content のどこに登場するか)

```sql
SELECT c.file_path, c.start_line, c.name, c.chunk_type
FROM fts_chunks f
JOIN chunks c ON f.rowid = c.id
WHERE fts_chunks MATCH 'keyword'
LIMIT 20;
```

## 出力

- 直接の答え (ファイル一覧、件数、チェーン) を最初に出す
- すべての主張に `file_path:line` を引用する
- 各主張の根拠を述べる: 事実はクエリ結果の row 直接、推論は "inferred by JOIN / aggregation / naming"

例:

```
TargetSymbol を使うファイルは 3 件 (direct query result)
  src/handlers/user.rs:42
  src/handlers/admin.rs:18
  src/tests/integration.rs:205

ref_kind は 'named' のみ (inferred from aggregation): import vs call の区別は不明
```
