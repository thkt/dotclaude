# npm/yarn/pnpmスクリプト

パッケージ管理とスクリプト実行。

## パッケージマネージャの検出

`package-lock.json`、`yarn.lock`、または `pnpm-lock.yaml` をチェックしてパッケージマネージャを識別。

```bash
# 検出ロジック
if [ -f "pnpm-lock.yaml" ]; then
  PM="pnpm"
elif [ -f "yarn.lock" ]; then
  PM="yarn"
else
  PM="npm"
fi
```

## 一般的な操作

### インストール

| npm | yarn | pnpm |
| --- | --- | --- |
| `npm install` | `yarn` | `pnpm install` |
| `npm ci` | `yarn --frozen-lockfile` | `pnpm install --frozen-lockfile` |

### スクリプト実行

| npm | yarn | pnpm |
| --- | --- | --- |
| `npm run <script>` | `yarn <script>` | `pnpm <script>` |
| `npm test` | `yarn test` | `pnpm test` |
| `npm run build` | `yarn build` | `pnpm build` |

### 依存関係の追加

| npm | yarn | pnpm |
| --- | --- | --- |
| `npm install <pkg>` | `yarn add <pkg>` | `pnpm add <pkg>` |
| `npm install -D <pkg>` | `yarn add -D <pkg>` | `pnpm add -D <pkg>` |
| `npm install -g <pkg>` | `yarn global add <pkg>` | `pnpm add -g <pkg>` |

### 依存関係の削除

| npm | yarn | pnpm |
| --- | --- | --- |
| `npm uninstall <pkg>` | `yarn remove <pkg>` | `pnpm remove <pkg>` |

### 依存関係のリスト

| npm | yarn | pnpm |
| --- | --- | --- |
| `npm list --depth=0` | `yarn list --depth=0` | `pnpm list --depth=0` |
| `npm outdated` | `yarn outdated` | `pnpm outdated` |

## 一般的なスクリプト

### 開発

```bash
npm run dev           # 開発サーバー
npm run start         # 本番開始
npm run build         # 本番用ビルド
```

### テスト

```bash
npm test              # テスト実行
npm run test:watch    # ウォッチモード
npm run test:coverage # カバレッジ付き
```

### リントとフォーマット

```bash
npm run lint          # リンター実行
npm run lint:fix      # 自動修正
npm run format        # コードフォーマット
```

### 型チェック

```bash
npm run typecheck     # TypeScriptチェック
npm run tsc           # TypeScriptコンパイル
```

## npx - パッケージの実行

グローバルインストールなしでパッケージからコマンドを実行:

```bash
npx create-next-app my-app
npx eslint --init
npx prettier --write .
```

## ベストプラクティス

### 1. ロックファイルを使用

常にロックファイル（`package-lock.json`、`yarn.lock`、`pnpm-lock.yaml`）をコミット。

### 2. CI/CD - Frozen Lockfileを使用

```bash
npm ci                          # npm
yarn --frozen-lockfile          # yarn
pnpm install --frozen-lockfile  # pnpm
```

### 3. 実行前にスクリプトを確認

```bash
npm run              # 利用可能なすべてのスクリプトをリスト
cat package.json | jq '.scripts'  # スクリプトを表示
```

### 4. ワークスペースコマンド（モノレポ）

```bash
# npmワークスペース
npm run build --workspaces
npm run test -w packages/core

# yarnワークスペース
yarn workspaces run build
yarn workspace @scope/core build

# pnpmワークスペース
pnpm -r run build
pnpm --filter @scope/core build
```

## コマンドとの統合

- `/test` が適切なテストコマンドを検出して実行
- `/code` が実装後にlint/typecheckを実行
- `/audit` がnpm audit問題をチェック
