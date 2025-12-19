# Evaluations for adr-creator

## Selection Criteria

このスキルがトリガーされるべきキーワードとコンテキスト:

- Keywords: ADR, アーキテクチャ決定, Architecture Decision Record, 技術選定, 設計判断, 決定記録
- Contexts: Architecture decisions, technology selection, design documentation

## Evaluation Scenarios (JSON Format - Anthropic公式Best Practices準拠)

### Scenario 1: Basic ADR Creation

```json
{
  "skills": ["adr-creator"],
  "query": "Reactを採用した決定をADRとして記録したい",
  "files": [],
  "expected_behavior": [
    "adr-creator skillがトリガーされる",
    "MADR形式のテンプレートが提供される",
    "Status, Context, Decision, Consequencesの各セクションが含まれる"
  ]
}
```

### Scenario 2: ADR with Alternatives

```json
{
  "skills": ["adr-creator"],
  "query": "データベース選定のADRを作成したい。PostgreSQLとMongoDBを比較した",
  "files": [],
  "expected_behavior": [
    "Considered Optionsセクションに両方の選択肢が記載される",
    "各選択肢のPros/Consが整理される",
    "最終決定の理由が明確に示される"
  ]
}
```

### Scenario 3: ADR Update

```json
{
  "skills": ["adr-creator"],
  "query": "既存のADRを更新してステータスを変更したい",
  "files": [],
  "expected_behavior": [
    "ADR更新のベストプラクティスが説明される",
    "Superseded/Deprecated等のステータス変更方法が示される",
    "関連ADRへのリンク方法が提供される"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered
- [ ] MADR format followed
- [ ] All required sections included
- [ ] Response was in Japanese
