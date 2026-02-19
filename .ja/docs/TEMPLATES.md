# テンプレート設計

テンプレートシステムの設計意図と使い方を説明します。

📌 **[English Version](../../docs/TEMPLATES.md)**

## 概要

```mermaid
flowchart LR
    subgraph Commands
        R["/research"] --> T["/think"] --> C["/code"] --> A["/audit"]
    end
    subgraph Templates
        R -.-> RF[research/template.md]
        T -.-> SOW[sow/template.md]
        T -.-> SPEC[spec/template.md]
    end
    subgraph Hooks
        PC[git commit] -.-> IDR[IDR template]
    end
```

## テンプレートカテゴリ

| カテゴリ    | テンプレート                  | 生成コマンド |
| ----------- | ----------------------------- | ------------ |
| `sow/`      | SOW (Statement of Work)       | `/think`     |
| `spec/`     | Specification                 | `/think`     |
| `research/` | Research findings             | `/research`  |
| `adr/`      | Architecture Decision Records | `/adr`       |
| `docs/`     | Documentation                 | `/docs`      |
| `issue/`    | GitHub Issues                 | `/issue`     |
| `audit/`    | Audit reports                 | `/audit`     |

## ドキュメントライフサイクル

```mermaid
flowchart TD
    subgraph Planning["計画フェーズ"]
        R[Research] --> SOW[SOW]
        SOW --> SPEC[Spec]
    end
    subgraph Implementation["実装フェーズ"]
        SPEC --> CODE[Code]
        CODE --> IDR[IDR]
    end
    subgraph Review["レビューフェーズ"]
        IDR --> AUDIT[Audit]
    end
```

| ドキュメント | 役割             | 対象者 | 更新             |
| ------------ | ---------------- | ------ | ---------------- |
| **SOW**      | 計画、基準、設計 | AI     | 承認後は静的     |
| **Spec**     | 実装詳細、テスト | AI     | 承認後は静的     |
| **IDR**      | 実装記録         | Human  | 動的（追記のみ） |

## テンプレート構造

### SOW テンプレート

```markdown
# SOW: {title}

## Status

- [ ] Draft
- [ ] Approved

## Context

[背景と目的]

## Acceptance Criteria

| ID     | Criterion | Priority |
| ------ | --------- | -------- |
| AC-001 | ...       | Must     |

## Implementation Plan

[実装計画]

## Non-Functional Requirements

[NFR]
```

### Spec テンプレート

```markdown
# Spec: {title}

## Component Design

[コンポーネント設計]

## Test Plan

| ID    | Description | Type |
| ----- | ----------- | ---- |
| T-001 | ...         | Unit |

## API Design

[API設計]
```

### ADR テンプレート

| テンプレート              | 用途                   |
| ------------------------- | ---------------------- |
| `technology-selection.md` | 技術選定               |
| `architecture-pattern.md` | アーキテクチャパターン |
| `deprecation.md`          | 非推奨化               |
| `process-change.md`       | プロセス変更           |

## 変数構文

テンプレート内で使用できる変数構文:

| パターン       | 例                | 出力           |
| -------------- | ----------------- | -------------- |
| `{field}`      | `{project_name}`  | `MyApp`        |
| `{obj.prop}`   | `{summary.total}` | `8`            |
| `{arr[].prop}` | `{items[].id}`    | 各アイテムのid |

詳細: [TEMPLATE_VARIABLES](../rules/conventions/TEMPLATE_VARIABLES.md)

## カスタマイズルール

1. **必須セクション維持**: `##` ヘッダーは変更しない
2. **確信度マーカー使用**: `[✓]` ≥95%, `[→]` 70-94%, `[?]` <70%
3. **ID規約遵守**: I-001, AC-001, FR-001, T-001, NFR-001

## ファイル配置

| ドキュメント | 配置場所                                                     |
| ------------ | ------------------------------------------------------------ |
| SOW/Spec     | `.claude/workspace/planning/[feature]/`                      |
| IDR          | 同上（SOW存在時）or `.claude/workspace/planning/YYYY-MM-DD/` |
| ADR          | `adr/NNNN-title.md`                                          |

## 関連

- [TEMPLATE_VARIABLES](../rules/conventions/TEMPLATE_VARIABLES.md) — 変数構文
- [idr-pre-commit.sh](../../hooks/lifecycle/idr-pre-commit.sh) — IDR生成フック
- [templates/README.md](../../templates/README.md) — テンプレート一覧
