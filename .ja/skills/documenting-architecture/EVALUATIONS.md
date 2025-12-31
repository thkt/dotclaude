# documenting-architectureの評価

## 選択基準

このスキルをトリガーするキーワードとコンテキスト:

- **キーワード**: architecture overview, project structure, module diagram, dependency graph, code structure, directory structure, アーキテクチャ概要, プロジェクト構成, モジュール図, 依存関係, コード構造, ディレクトリ構成
- **コンテキスト**: アーキテクチャドキュメント生成、コードベース分析、/docs:architectureコマンド

## 評価シナリオ

### シナリオ1: プロジェクト構造概要

```json
{
  "skills": ["documenting-architecture"],
  "query": "このプロジェクトのアーキテクチャ概要を生成して",
  "files": [],
  "expected_behavior": [
    "スキルが'アーキテクチャ概要'でトリガーされる",
    "技術スタックとフレームワークを検出",
    "treeでディレクトリ構造を生成",
    "モジュール構成図（Mermaid）を作成",
    "統計付きで主要コンポーネントをリスト"
  ]
}
```

### シナリオ2: モジュール関係図

```json
{
  "skills": ["documenting-architecture"],
  "query": "モジュール間の依存関係を図にして",
  "files": [],
  "expected_behavior": [
    "スキルが'モジュール'と'依存関係'でトリガーされる",
    "import文を分析",
    "Mermaidフローチャートを生成",
    "モジュール関係を示す",
    "循環依存があれば特定"
  ]
}
```

### シナリオ3: 依存関係グラフ

```json
{
  "skills": ["documenting-architecture"],
  "query": "外部/内部の依存関係をビジュアライズしたい",
  "files": [],
  "expected_behavior": [
    "スキルが'依存関係'でトリガーされる",
    "外部と内部の依存関係を分離",
    "ロックファイルからnpm/pipパッケージをリスト",
    "内部モジュール依存を示す",
    "依存関係のビジュアライゼーションを生成"
  ]
}
```

### シナリオ4: コード統計

```json
{
  "skills": ["documenting-architecture"],
  "query": "コードベースの統計情報を出して",
  "files": [],
  "expected_behavior": [
    "スキルが'統計'でトリガーされる",
    "タイプ別のファイル数をカウント",
    "総コード行数をレポート",
    "クラス/関数数をリスト",
    "可能であればテストカバレッジを示す"
  ]
}
```

### シナリオ5: 主要コンポーネント分析

```json
{
  "skills": ["documenting-architecture"],
  "query": "主要コンポーネントの一覧と役割をドキュメント化して",
  "files": [],
  "expected_behavior": [
    "スキルが'コンポーネント'と'ドキュメント'でトリガーされる",
    "抽出にtree-sitter-analyzerを使用",
    "クラスと関数をリスト",
    "コメントから役割の説明を抽出",
    "モジュール/ディレクトリ別に整理"
  ]
}
```

## 手動検証チェックリスト

各シナリオ実行後:

- [ ] スキルがアーキテクチャキーワードで正しくトリガーされた
- [ ] 技術スタックが正しく検出された
- [ ] ディレクトリ構造が生成された
- [ ] Mermaid図が有効だった
- [ ] 統計が正確だった
- [ ] コード分析にtree-sitter-analyzerが使用された

## ベースライン比較

### スキルなし

- 手動のアーキテクチャドキュメント
- ビジュアル図なし
- 統計の欠落
- 構造が一貫しない

### スキルあり

- 自動コードベース分析
- Mermaid図生成
- 包括的な統計
- tree-sitterベースの正確な抽出
- 一貫したドキュメント形式
