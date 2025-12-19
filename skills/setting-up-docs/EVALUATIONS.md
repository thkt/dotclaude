# Evaluations for setting-up-docs

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: setup guide, environment setup, development environment, installation guide, getting started, prerequisites, セットアップガイド, 環境構築, 開発環境, インストールガイド, 始め方, 前提条件
- **Contexts**: Environment documentation, onboarding guides, /docs:setup command

## Evaluation Scenarios

### Scenario 1: Environment Setup Guide Generation

```json
{
  "skills": ["setting-up-docs"],
  "query": "このプロジェクトのセットアップガイドを自動生成して",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'セットアップガイド'",
    "Detects package manager (npm/yarn/pnpm/pip)",
    "Lists required tools and versions",
    "Extracts environment variables from .env.example",
    "Documents startup commands"
  ]
}
```

### Scenario 2: Prerequisites Detection

```json
{
  "skills": ["setting-up-docs"],
  "query": "開発に必要な前提条件をドキュメント化して",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by '前提条件'",
    "Detects Node.js version from .nvmrc",
    "Detects Python version from .python-version",
    "Lists tool-versions from asdf",
    "Shows required global installations"
  ]
}
```

### Scenario 3: Environment Variables Documentation

```json
{
  "skills": ["setting-up-docs"],
  "query": "必要な環境変数をドキュメント化したい",
  "files": [".env.example"],
  "expected_behavior": [
    "Skill is triggered by '環境変数'",
    "Parses .env.example file",
    "Lists all required variables",
    "Includes descriptions from comments",
    "Shows default values if any"
  ]
}
```

### Scenario 4: Multi-Language Project Setup

```json
{
  "skills": ["setting-up-docs"],
  "query": "モノレポの各パッケージのセットアップ手順を出して",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'セットアップ'",
    "Detects multiple package managers",
    "Generates per-package setup instructions",
    "Shows workspace-level commands",
    "Documents inter-package dependencies"
  ]
}
```

### Scenario 5: Docker Development Environment

```json
{
  "skills": ["setting-up-docs"],
  "query": "Docker開発環境のセットアップをドキュメント化して",
  "files": ["docker-compose.yml", "Dockerfile"],
  "expected_behavior": [
    "Skill is triggered by 'Docker' and 'セットアップ'",
    "Parses docker-compose.yml",
    "Documents services and ports",
    "Shows required docker commands",
    "Lists volume mounts and networks"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by setup keywords
- [ ] Package manager was correctly detected
- [ ] Required tools and versions were listed
- [ ] Environment variables were documented
- [ ] Startup commands were accurate
- [ ] Multi-language/monorepo support worked

## Baseline Comparison

### Without Skill

- Manual README writing
- May miss required tools
- Outdated version requirements
- Incomplete env var documentation

### With Skill

- Automatic detection from config files
- Multi-package-manager support
- Version detection from .nvmrc etc.
- Environment variable extraction
- Docker setup documentation
