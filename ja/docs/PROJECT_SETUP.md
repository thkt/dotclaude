# プロジェクトセットアップ推奨事項

このドキュメントは、プロジェクトでClaude Codeをセットアップするための推奨事項を含んでいます。

## フック設定

### ファイル編集後の自動フォーマット

プロジェクトの`.claude/settings.json`にフックを設定して、ファイル変更後に自動的にフォーマッターを実行することをお勧めします。

#### 設定例

**Biomeを使用するプロジェクト:**

```json
{
  "hooks": {
    "after": {
      "Edit": "npm run check -- {{file_path}}",
      "MultiEdit": "npm run check -- {{file_path}}",
      "Write": "npm run check -- {{file_path}}"
    }
  }
}
```

**Prettier + ESLintを使用するプロジェクト:**

```json
{
  "hooks": {
    "after": {
      "Edit": "npx prettier --write {{file_path}} && npx eslint --fix {{file_path}}",
      "MultiEdit": "npx prettier --write {{file_path}} && npx eslint --fix {{file_path}}",
      "Write": "npx prettier --write {{file_path}} && npx eslint --fix {{file_path}}"
    }
  }
}
```

**Denoプロジェクト:**

```json
{
  "hooks": {
    "after": {
      "Edit": "deno fmt {{file_path}}",
      "MultiEdit": "deno fmt {{file_path}}",
      "Write": "deno fmt {{file_path}}"
    }
  }
}
```

**Blackを使用するPythonプロジェクト:**

```json
{
  "hooks": {
    "after": {
      "Edit": "black {{file_path}}",
      "MultiEdit": "black {{file_path}}",
      "Write": "black {{file_path}}"
    }
  }
}
```

### フックで利用可能な変数

- `{{file_path}}`: 編集されたファイルの絶対パス
- フックはプロジェクトルートディレクトリで実行されます

### ベストプラクティス

1. **既存のnpmスクリプトを使用**: プロジェクトにpackage.jsonのフォーマットスクリプトがある場合は、それらを使用
2. **高速に保つ**: フックは同期的に実行されるため、長時間実行される操作は避ける
3. **エラーを適切に処理**: 編集をブロックしないように`|| true`の使用を検討
4. **プロジェクト固有**: 常にプロジェクトごとにフックを設定し、グローバルには設定しない

### トラブルシューティング

フックが編集をブロックしている場合：

1. コマンド構文を確認
2. フォーマッターがインストールされていることを確認
3. `.claude/settings.json`を削除/名前変更して一時的にフックを無効化
4. Claude Codeの出力でエラーメッセージを確認

## その他のプロジェクト設定

### 推奨される.gitignoreエントリ

プロジェクトの`.gitignore`に以下を追加：

```markdown
# Claude Code一時ファイル
.claude/logs/
.claude/workspace/tasks/active/
```

### ワークスペース構造

以下の作成を検討：

```txt
.claude/
├── settings.json      # プロジェクト固有のClaude Code設定
├── workspace/         # プロジェクトナレッジベース
│   └── index/        # プロジェクトパターンと決定事項
└── CLAUDE.md         # プロジェクト固有のAI指示
```
