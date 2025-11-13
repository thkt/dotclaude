---
name: readability-review
description: >
  Code readability review based on "The Art of Readable Code" and Miller's Law (7±2 cognitive limits).
  Use when reviewing readability (可読性), understandability (理解しやすい/わかりやすい),
  clarity (明確), naming (命名), variable/function names (変数名/関数名), nesting depth
  (ネスト/深いネスト), function design (関数設計), comments (コメント), complexity (複雑),
  confusing code (難しい/難読), Miller's Law (ミラーの法則), cognitive load (認知負荷),
  AI-generated code issues, premature optimization, over-engineering (過剰設計), or
  unnecessary abstractions (不要な抽象化). Detects readability issues and suggests improvements
  based on cognitive science. Essential for readability-focused code reviews.
allowed-tools: Read, Grep, Glob, Task
---

# Readability Review - Code Clarity & Cognitive Load Analysis

## 🎯 Core Philosophy

**"Code should be written to minimize the time it would take for someone else to understand it"**

- That "someone else" might be you six months later
- Understanding time > writing time
- **Target**: New team member can understand code in < 1 minute

---

## 🧠 Scientific Foundation: Miller's Law

**Human cognitive capacity is limited to 7±2 items**

When code exceeds these limits:

- Comprehension time increases exponentially
- Error rates multiply
- Mental fatigue accelerates

Our brains literally cannot process too much complexity at once.

**Recommended Limits**:

| Context | Ideal | Maximum |
|---------|-------|---------|
| Function arguments | 3 | 5 |
| Class methods | 5 | 7 |
| Conditional branches | 3 | 5 |
| Function length | 5-10 lines | 15 lines |
| Nesting depth | 2 | 3 |

---

## 📚 Section-Based Content

This skill is organized into 4 specialized sections for efficient context usage:

### 📝 Section 1: Naming & Structure Fundamentals

**File**: [`references/naming-structure.md`](./references/naming-structure.md)
**Tokens**: ~500
**Focus**: Variable/function naming, concrete vs abstract, searchability

**Triggers**: naming, 命名, variable name, 変数名, function name, 関数名, concrete, abstract

**Coverage**:

- Names that can't be misconstrued
- Concrete over abstract naming
- Searchable, pronounceable names
- Specific vs generic naming

---

### 🔀 Section 2: Control Flow & Complexity

**File**: [`references/control-flow.md`](./references/control-flow.md)
**Tokens**: ~600
**Focus**: Control flow optimization, nesting reduction, Miller's Law application

**Triggers**: nesting, ネスト, control flow, Miller's Law, complexity, guard clause, early return

**Coverage**:

- Minimize nesting depth
- Guard clauses and early returns
- Extract complex conditions
- Miller's Law application (7±2 limits)
- Function length and complexity guidelines

---

### 💬 Section 3: Comments & Clarity

**File**: [`references/comments-clarity.md`](./references/comments-clarity.md)
**Tokens**: ~400
**Focus**: Comment strategy, intent communication, code self-documentation

**Triggers**: comments, コメント, documentation, intent, 意図, obvious, clarity

**Coverage**:

- Why, not What comments
- Code first, comments second
- Update or delete outdated comments
- Make code look like intent

---

### 🤖 Section 4: AI Code Antipatterns

**File**: [`references/ai-antipatterns.md`](./references/ai-antipatterns.md)
**Tokens**: ~500
**Focus**: Detecting over-engineering patterns in AI-generated code

**Triggers**: AI, AI-generated, premature, over-engineering, unnecessary abstraction

**Coverage**:

- Premature abstraction detection
- Unnecessary classes for simple tasks
- Imagined extensibility
- Detection & remediation strategies

---

## 💡 Practical Application

### Auto-Trigger Example

```markdown
User: "This function is hard to understand"

Readability Review Skill triggers →

"From a readability perspective, let's improve:

1. Function name clarity
2. Nesting reduction (currently 4 levels)
3. Extract complex conditions
4. Apply Miller's Law (max 5 parameters)

Let me suggest specific improvements..."
```

### Common Scenarios

1. **Function review**
   - Check parameter count (≤5)
   - Verify function length (5-15 lines)
   - Assess nesting depth (≤3 levels)

2. **Variable naming**
   - Ensure concrete over abstract
   - Check searchability
   - Verify pronounceability

3. **Code structure**
   - Apply guard clauses
   - Extract subproblems
   - One task per function

4. **AI code review**
   - Detect premature abstractions
   - Flag unnecessary classes
   - Identify over-engineering

---

## ✨ Key Takeaways

1. **Clarity beats cleverness** - Simple code wins
2. **Respect cognitive limits** - Miller's Law (7±2)
3. **Names matter** - Concrete, searchable, pronounceable
4. **Control flow** - Minimize nesting, use guard clauses
5. **Comments wisely** - Explain why, not what

---

**The Final Test**: "Would a new team member understand this in < 1 minute?"
