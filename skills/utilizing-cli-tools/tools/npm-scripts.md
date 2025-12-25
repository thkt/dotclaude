# npm/yarn/pnpm Scripts

Package management and script execution.

## Package Manager Detection

Check `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml` to identify the package manager.

```bash
# Detection logic
if [ -f "pnpm-lock.yaml" ]; then
  PM="pnpm"
elif [ -f "yarn.lock" ]; then
  PM="yarn"
else
  PM="npm"
fi
```

## Common Operations

### Installation

| npm | yarn | pnpm |
| --- | --- | --- |
| `npm install` | `yarn` | `pnpm install` |
| `npm ci` | `yarn --frozen-lockfile` | `pnpm install --frozen-lockfile` |

### Running Scripts

| npm | yarn | pnpm |
| --- | --- | --- |
| `npm run <script>` | `yarn <script>` | `pnpm <script>` |
| `npm test` | `yarn test` | `pnpm test` |
| `npm run build` | `yarn build` | `pnpm build` |

### Adding Dependencies

| npm | yarn | pnpm |
| --- | --- | --- |
| `npm install <pkg>` | `yarn add <pkg>` | `pnpm add <pkg>` |
| `npm install -D <pkg>` | `yarn add -D <pkg>` | `pnpm add -D <pkg>` |
| `npm install -g <pkg>` | `yarn global add <pkg>` | `pnpm add -g <pkg>` |

### Removing Dependencies

| npm | yarn | pnpm |
| --- | --- | --- |
| `npm uninstall <pkg>` | `yarn remove <pkg>` | `pnpm remove <pkg>` |

### Listing Dependencies

| npm | yarn | pnpm |
| --- | --- | --- |
| `npm list --depth=0` | `yarn list --depth=0` | `pnpm list --depth=0` |
| `npm outdated` | `yarn outdated` | `pnpm outdated` |

## Common Scripts

### Development

```bash
npm run dev           # Development server
npm run start         # Production start
npm run build         # Build for production
```

### Testing

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

### Linting & Formatting

```bash
npm run lint          # Run linter
npm run lint:fix      # Auto-fix issues
npm run format        # Format code
```

### Type Checking

```bash
npm run typecheck     # TypeScript check
npm run tsc           # Compile TypeScript
```

## npx - Execute Packages

Run commands from packages without global install:

```bash
npx create-next-app my-app
npx eslint --init
npx prettier --write .
```

## Best Practices

### 1. Use Lock Files

Always commit lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`).

### 2. CI/CD - Use Frozen Lockfile

```bash
npm ci                          # npm
yarn --frozen-lockfile          # yarn
pnpm install --frozen-lockfile  # pnpm
```

### 3. Check Scripts Before Running

```bash
npm run              # List all available scripts
cat package.json | jq '.scripts'  # View scripts
```

### 4. Workspace Commands (Monorepo)

```bash
# npm workspaces
npm run build --workspaces
npm run test -w packages/core

# yarn workspaces
yarn workspaces run build
yarn workspace @scope/core build

# pnpm workspaces
pnpm -r run build
pnpm --filter @scope/core build
```

## Integration with Commands

- `/test` detects and runs appropriate test command
- `/code` runs lint/typecheck after implementation
- `/audit` checks for npm audit issues
