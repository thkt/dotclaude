# Phase 0: Worktree Bootstrap

Codex exec 操作 (テスト実行、adversarial test 生成) のために、隔離された git worktree を作成して準備する。orchestrator が worktree を作成し (0a)、`${CLAUDE_SKILL_DIR}/scripts/bootstrap.py` を background で実行して検出・インストール・build smoke test の JSON verdict を読む (0b)。

## 0a. Worktree 作成

```bash
"${CLAUDE_SKILL_DIR}/scripts/worktree.py" "${SESSION_ID}"
```

stale な worktree とブランチを削除してから HEAD で新規作成し、JSON {branch, path, status} を返す。orchestrator は `path` を 0b 以降と Cleanup に渡す。status が error なら環境的失敗として bootstrap を中断する。

## 0b. 検出・インストール・build

```bash
"${CLAUDE_SKILL_DIR}/scripts/bootstrap.py" "<0a の path>"
```

スクリプトは JSON オブジェクトを 1 件出力する。orchestrator が読むのは下記フィールド。

| フィールド   | 値                       | 意味                                                           |
| ------------ | ------------------------ | -------------------------------------------------------------- |
| project_type | node / rust / make / ... | マーカーファイルがなければ null                                |
| install      | ok / fail / skip         | skip ならそのプロジェクトタイプに依存 step がない              |
| build        | pass / fail / skipped    | skipped は build の概念なし or 上流の環境的失敗                |
| reason       | 文字列                   | env:install- / build- / no-build-script / project-type-unknown |

## Gate 分岐

Build 結果は (install, build) の組で決まり、`pass` / `fail` / `skipped` の三値で表す。build 開始後に発火したタイムアウトは `build = fail` として報告する。`caveat パス` の最終的なゲート判定は `${CLAUDE_SKILL_DIR}/references/phase-4.md` § Bootstrap 失敗処理 が持つ。

| install   | build   | 意味               | Build 列  | Phase 1c, 2a          |
| --------- | ------- | ------------------ | --------- | --------------------- |
| ok / skip | pass    | clean              | `pass`    | 続行                  |
| ok / skip | skipped | build の概念なし   | `skipped` | 続行                  |
| ok        | fail    | build smoke broken | `fail`    | スキップ              |
| fail      | skipped | 環境的失敗         | `skipped` | スキップ、caveat パス |

## クリーンアップ

すべての phase を try / finally で囲み、結果に関わらず cleanup を保証する。

```bash
"${CLAUDE_SKILL_DIR}/scripts/worktree.py" --cleanup "${SESSION_ID}"
```

## エラーレポート

```markdown
Bootstrap: failed
Reason: {bootstrap.py JSON の reason フィールド}
Impact: Outcome assertion and adversarial testing skipped. Static-only mode.
```
