# Evaluations for performance-optimization

## Selection Criteria

このスキルがトリガーされるべきキーワードとコンテキスト:

- Keywords: パフォーマンス, 最適化, 高速化, Web Vitals, LCP, FID, CLS, Lighthouse, 遅い, 重い
- Contexts: Performance analysis, optimization tasks, web vitals improvement

## Evaluation Scenarios (JSON Format - Anthropic公式Best Practices準拠)

### Scenario 1: Basic Performance Analysis

```json
{
  "skills": ["performance-optimization"],
  "query": "このページが遅いので改善したい",
  "files": [],
  "expected_behavior": [
    "performance-optimization skillがトリガーされる",
    "Web Vitals (LCP, FID, CLS) の説明がある",
    "測定方法（Lighthouse, DevTools）が提案される",
    "段階的な改善手順が示される"
  ]
}
```

### Scenario 2: React Optimization

```json
{
  "skills": ["performance-optimization"],
  "query": "Reactコンポーネントの再レンダリングが多すぎる",
  "files": [],
  "expected_behavior": [
    "React固有の最適化手法が参照される",
    "useMemo, useCallback, React.memoの使い分けが説明される",
    "具体的なコード例が提供される"
  ]
}
```

### Scenario 3: Bundle Size Optimization

```json
{
  "skills": ["performance-optimization"],
  "query": "バンドルサイズを削減したい",
  "files": [],
  "expected_behavior": [
    "バンドル分析ツール（webpack-bundle-analyzer等）が紹介される",
    "Code splitting, lazy loadingの手法が説明される",
    "Tree shakingの確認方法が示される"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered
- [ ] Measurement-first approach emphasized
- [ ] Specific optimization techniques provided
- [ ] Response was in Japanese
