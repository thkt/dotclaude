# References

コマンドやスキルから参照される補助ドキュメント。

**注意**: このディレクトリ配下のファイルはスラッシュコマンドとして読み込まれません。

## 構造

```text
references/
└── commands/           # コマンドから参照されるドキュメント
    ├── code/           # /code コマンド用
    ├── fix/            # /fix コマンド用
    └── shared/         # 複数コマンドで共有
```

## 使用方法

コマンドやスキルから参照する場合：

```markdown
[@~/.claude/references/commands/code/quality-gates.md]
```

## 今後の拡張

必要に応じて以下を追加可能：

- `references/skills/` - スキル用の参照ドキュメント
- `references/agents/` - エージェント用の参照ドキュメント
- `references/rules/` - 理論・原則ドキュメント
