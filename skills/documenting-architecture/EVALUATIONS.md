# Evaluations for documenting-architecture

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: architecture overview, project structure, module diagram, dependency graph, code structure, directory structure, アーキテクチャ概要, プロジェクト構成, モジュール図, 依存関係, コード構造, ディレクトリ構成
- **Contexts**: Architecture documentation generation, codebase analysis, /docs:architecture command

## Evaluation Scenarios

### Scenario 1: Project Structure Overview

```json
{
  "skills": ["documenting-architecture"],
  "query": "このプロジェクトのアーキテクチャ概要を生成して",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'アーキテクチャ概要'",
    "Detects tech stack and framework",
    "Generates directory structure via tree",
    "Creates module composition diagram (Mermaid)",
    "Lists key components with statistics"
  ]
}
```

### Scenario 2: Module Relationship Diagram

```json
{
  "skills": ["documenting-architecture"],
  "query": "モジュール間の依存関係を図にして",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'モジュール' and '依存関係'",
    "Analyzes import statements",
    "Generates Mermaid flowchart",
    "Shows module relationships",
    "Identifies circular dependencies if any"
  ]
}
```

### Scenario 3: Dependency Graph

```json
{
  "skills": ["documenting-architecture"],
  "query": "外部/内部の依存関係をビジュアライズしたい",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by '依存関係'",
    "Separates external vs internal dependencies",
    "Lists npm/pip packages from lock files",
    "Shows internal module dependencies",
    "Generates dependency visualization"
  ]
}
```

### Scenario 4: Code Statistics

```json
{
  "skills": ["documenting-architecture"],
  "query": "コードベースの統計情報を出して",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by '統計'",
    "Counts files by type",
    "Reports total lines of code",
    "Lists class/function counts",
    "Shows test coverage if available"
  ]
}
```

### Scenario 5: Key Component Analysis

```json
{
  "skills": ["documenting-architecture"],
  "query": "主要コンポーネントの一覧と役割をドキュメント化して",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'コンポーネント' and 'ドキュメント'",
    "Uses tree-sitter-analyzer for extraction",
    "Lists classes and functions",
    "Extracts role descriptions from comments",
    "Organizes by module/directory"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by architecture keywords
- [ ] Tech stack was correctly detected
- [ ] Directory structure was generated
- [ ] Mermaid diagrams were valid
- [ ] Statistics were accurate
- [ ] tree-sitter-analyzer was used for code analysis

## Baseline Comparison

### Without Skill

- Manual architecture documentation
- No visual diagrams
- Missing statistics
- Inconsistent structure

### With Skill

- Automatic codebase analysis
- Mermaid diagram generation
- Comprehensive statistics
- tree-sitter-based precise extraction
- Consistent documentation format
