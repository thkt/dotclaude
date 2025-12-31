# リファレンス

コマンドとスキルから参照される補助ドキュメント。

**注**: このディレクトリ内のファイルはスラッシュコマンドとしてロードされません。

## 構造

```text
references/
└── commands/           # コマンドから参照されるドキュメント
    ├── code/           # /code コマンド用
    ├── fix/            # /fix コマンド用
    └── shared/         # 複数コマンドで共有
```

## 使用方法

コマンドやスキルから参照:

```markdown
[@~/.claude/references/commands/code/quality-gates.md]
```

## 将来の拡張

必要に応じて追加:

- `references/skills/` - スキル用ドキュメント
- `references/agents/` - エージェント用ドキュメント
- `references/rules/` - 理論/原則ドキュメント
