# Evaluations for enhancing-progressively

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: layout, レイアウト, styling, スタイル, position, 位置, animation, アニメーション, show/hide, 表示/非表示, toggle, トグル, responsive, レスポンシブ, CSS Grid, Flexbox, transform, transition, CSS-only, CSSのみ, JavaScript不要, シンプル
- **Contexts**: Layout implementation, visual design, CSS vs JS decision, performance optimization

## Evaluation Scenarios

### Scenario 1: CSS-First Decision

```json
{
  "skills": ["enhancing-progressively"],
  "query": "モーダルの表示/非表示をJavaScriptで実装しようとしています",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by '表示/非表示' keyword",
    "Suggests CSS-only solution first (dialog element, :target, checkbox hack)",
    "Explains 'The best code is no code' philosophy",
    "Shows HTML → CSS → JS priority",
    "Provides concrete CSS-only modal example"
  ]
}
```

### Scenario 2: Layout Without JavaScript

```json
{
  "skills": ["enhancing-progressively"],
  "query": "オーバーレイ表示をどう実装するのがいい？",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'オーバーレイ'",
    "Recommends CSS Grid stacking technique",
    "Shows grid-column/grid-row overlay pattern",
    "Avoids position:absolute when not necessary",
    "Emphasizes no JavaScript needed"
  ]
}
```

### Scenario 3: Animation Implementation

```json
{
  "skills": ["enhancing-progressively"],
  "query": "ボタンホバー時にアニメーションをつけたい",
  "files": ["src/components/Button.tsx"],
  "expected_behavior": [
    "Skill is triggered by 'アニメーション'",
    "Recommends CSS transition/animation",
    "Shows transform-based animation (GPU accelerated)",
    "Warns against JS-based animation for simple effects",
    "Provides performant CSS example"
  ]
}
```

### Scenario 4: Responsive Design

```json
{
  "skills": ["enhancing-progressively"],
  "query": "レスポンシブ対応でブレークポイント処理をどうすべき？",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'レスポンシブ'",
    "Recommends CSS media queries / container queries",
    "Discourages JavaScript resize listeners for layout",
    "Shows mobile-first CSS approach",
    "Mentions CSS-only solutions before JS"
  ]
}
```

### Scenario 5: State-Based Styling

```json
{
  "skills": ["enhancing-progressively"],
  "query": "タブの選択状態に応じてスタイルを変えたい",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by '選択状態' and 'スタイル'",
    "Suggests :checked, :has(), :target pseudo-classes",
    "Shows CSS-only tab implementation",
    "Explains progressive enhancement approach",
    "JS only for complex state management"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by CSS/layout keywords
- [ ] CSS-first approach was recommended
- [ ] "The best code is no code" philosophy applied
- [ ] HTML → CSS → JS priority was followed
- [ ] Concrete CSS examples were provided
- [ ] JavaScript was suggested only when necessary

## Baseline Comparison

### Without Skill

- May default to JavaScript solutions
- Misses CSS-only alternatives
- No progressive enhancement mindset

### With Skill

- CSS-first recommendations
- Modern CSS techniques (Grid, :has(), container queries)
- Clear priority: HTML → CSS → JS
- YAGNI philosophy applied to code choices
