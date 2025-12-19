# Evaluations for integrating-storybook

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: Storybook, Stories, component API, component specification, props, argTypes, variants, CSF, CSF3, autodocs, frontend component, コンポーネント仕様, ストーリー
- **Contexts**: Component development, design system, spec.md generation, /think command, /code command

## Evaluation Scenarios

### Scenario 1: Component API to Stories

```json
{
  "skills": ["integrating-storybook"],
  "query": "spec.mdのComponent APIからStoriesを自動生成したい",
  "files": [".claude/workspace/planning/spec.md"],
  "expected_behavior": [
    "Skill is triggered by 'Stories' and 'spec.md'",
    "Reads Component API section from spec.md",
    "Generates CSF3 format Stories skeleton",
    "Maps Props to argTypes correctly",
    "Includes autodocs configuration"
  ]
}
```

### Scenario 2: Component API Template

```json
{
  "skills": ["integrating-storybook"],
  "query": "/thinkでButtonコンポーネントの仕様を作成したい",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by '/think' and 'コンポーネント'",
    "Provides Component API template for spec.md",
    "Includes Props, Variants, States sections",
    "Shows example Props table format",
    "Prepares for Stories generation"
  ]
}
```

### Scenario 3: CSF3 Best Practices

```json
{
  "skills": ["integrating-storybook"],
  "query": "Storybookのベストプラクティスを教えて",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'Storybook' and 'ベストプラクティス'",
    "Explains CSF3 format benefits",
    "Shows meta/args/render pattern",
    "Recommends autodocs integration",
    "Demonstrates play function usage"
  ]
}
```

### Scenario 4: Props to argTypes Mapping

```json
{
  "skills": ["integrating-storybook"],
  "query": "TypeScriptのPropsをStorybookのargTypesに変換したい",
  "files": ["src/components/Button/Button.tsx"],
  "expected_behavior": [
    "Skill is triggered by 'Props' and 'argTypes'",
    "Analyzes TypeScript Props interface",
    "Generates corresponding argTypes",
    "Handles union types as select controls",
    "Sets appropriate control types"
  ]
}
```

### Scenario 5: Variants Stories Generation

```json
{
  "skills": ["integrating-storybook"],
  "query": "コンポーネントの各バリアントのStoriesを作成して",
  "files": ["src/components/Alert/Alert.tsx"],
  "expected_behavior": [
    "Skill is triggered by 'バリアント' and 'Stories'",
    "Identifies component variants from Props",
    "Creates Story for each variant",
    "Uses args spread pattern",
    "Follows naming convention (Primary, Secondary, etc.)"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by Storybook-related keywords
- [ ] CSF3 format was used (not CSF2)
- [ ] Props → argTypes mapping was correct
- [ ] autodocs integration was included
- [ ] Component API template was provided when relevant
- [ ] Generated code was immediately usable

## Baseline Comparison

### Without Skill

- May use outdated CSF2 format
- Manual Props → argTypes mapping
- No spec.md integration
- Missing autodocs setup

### With Skill

- CSF3 format with best practices
- Automatic Props → argTypes mapping
- spec.md → Stories workflow
- autodocs integration
- /think and /code command integration
