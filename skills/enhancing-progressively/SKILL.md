---
name: enhancing-progressively
description: >
  Progressive Enhancement guide with CSS-first approach and outcome-first development philosophy.
  Use when working with layout (レイアウト), styling (スタイル), positioning (位置),
  animations (アニメーション), show/hide functionality (表示/非表示), toggles (トグル),
  responsive design (レスポンシブ), CSS Grid, Flexbox, transforms, transitions, or when
  seeking CSS-only solutions (CSSのみ/JavaScript不要). Suggests CSS solutions before
  JavaScript, promoting simple (シンプル), maintainable, and performant implementations
  based on "The best code is no code" and YAGNI philosophy.
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Progressive Enhancement - CSS-First Development

## 🎯 Core Philosophy

**"The best code is no code"** - If CSS can solve it, JavaScript is unnecessary

### Priority

1. **HTML** - Structure and semantics
2. **CSS** - Visual presentation and layout
3. **JavaScript** - Only when truly necessary

---

## 🎨 CSS-First Solutions

### Layout

#### Grid

```css
/* ✅ CSS Grid overlay */
.container {
  display: grid;
}

.background, .foreground {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
}

/* ❌ No JavaScript needed: avoid position: absolute */
```

**Use cases**:

- Modal overlays
- Badge positioning on cards
- Layering background images with foreground content

#### Flexbox

```css
/* ✅ Center alignment */
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* ❌ No JavaScript needed: manual calculation and position setting */
```

---

### Position

```css
/* ✅ Transform - no reflow */
.move-up {
  transform: translateY(-10px);
  transition: transform 0.3s;
}

/* ❌ Avoid top/left (causes reflow) */
.move-up-bad {
  position: relative;
  top: -10px;  /* Triggers reflow */
}
```

**Performance**:

- `transform`: GPU accelerated, no reflow
- `top/left/margin`: CPU rendering, causes reflow

---

### Show/Hide

```css
/* ✅ visibility/opacity for animations */
.hidden {
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.3s, visibility 0s 0.3s;
}

.visible {
  visibility: visible;
  opacity: 1;
  transition: opacity 0.3s;
}

/* ❌ display: none disappears instantly, no animation */
```

---

### Responsive

#### Media Queries

```css
/* ✅ Mobile-first */
.component {
  /* Mobile default styles */
  flex-direction: column;
}

@media (min-width: 768px) {
  .component {
    flex-direction: row;
  }
}

/* ❌ No JavaScript needed: window.innerWidth detection */
```

#### Container Queries

```css
/* ✅ Based on component's own size */
.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card {
    grid-template-columns: 1fr 1fr;
  }
}

/* ❌ ResizeObserver not needed */
```

---

### State Management

#### :target

```css
/* ✅ URL hash-based state management */
.modal {
  display: none;
}

.modal:target {
  display: flex;
}

/* HTML: <a href="#modal">Open</a> */
/* ❌ No JavaScript needed: showModal(), hideModal() */
```

#### :checked

```css
/* ✅ Checkbox state management */
.toggle:checked ~ .content {
  max-height: 500px;
  opacity: 1;
}

.toggle:not(:checked) ~ .content {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}

/* ❌ No JavaScript needed: toggleClass() */
```

#### :has()

```css
/* ✅ Parent element styling */
.form:has(input:invalid) .submit-button {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ❌ No JavaScript needed: input.addEventListener('invalid') */
```

---

## 🔀 Common Patterns

### Accordion

```html
<details>
  <summary>Click to expand</summary>
  <p>Expanded content</p>
</details>
```

```css
details {
  border: 1px solid #ddd;
}

summary {
  cursor: pointer;
  padding: 1rem;
}

summary::marker {
  content: '▶ ';
}

details[open] summary::marker {
  content: '▼ ';
}

/* ❌ No JavaScript needed: onClick, setState, CSS class toggle */
```

**Benefits**:

- Browser native
- Accessibility built-in
- Keyboard navigation supported

---

### Tooltip

```css
.tooltip {
  position: relative;
}

.tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);

  /* Hidden by default */
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s, visibility 0s 0.3s;
}

.tooltip:hover::after,
.tooltip:focus::after {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.3s;
}

/* HTML: <button class="tooltip" data-tooltip="Hint">Button</button> */
/* ❌ No JavaScript needed: position calculation, show/hide control */
```

---

### Modal

```css
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);

  display: none;
  place-items: center;
}

.modal:target {
  display: grid;
}

/* HTML: <a href="#myModal">Open</a> */
/* HTML: <div id="myModal" class="modal">...</div> */
/* ❌ No JavaScript needed: openModal(), closeModal() */
```

---

## ⚖️ When JavaScript is Needed

### CSS is Sufficient For

- ✅ Static animations
- ✅ Hover, focus, checkbox state changes
- ✅ Simple show/hide toggles
- ✅ Responsive layouts
- ✅ URL-based state management

### JavaScript is Required For

- ❌ API data fetching
- ❌ Form submission and validation
- ❌ Complex state management (multiple interactions)
- ❌ Dynamic content generation
- ❌ Browser API usage (localStorage, WebSocket, etc.)

---

## 🚀 Decision Framework

Before implementation, ask yourself:

### 1. "Can this be done with CSS alone?"

```text
Layout → Grid/Flexbox
Position → Transform
Display control → visibility/opacity
State management → :target, :checked, :has()
Animation → transition/animation
```

### 2. "Is this really needed now?" (YAGNI)

```text
❓ Is there an actual problem occurring?
❓ Have users requested this?
❓ Is there measurable evidence?

All No → Don't implement yet
```

### 3. "What's the simplest solution?" (Occam's Razor)

```text
Option A: 3 lines of CSS
Option B: 50 lines of JavaScript + 10 lines of CSS

→ Choose Option A
```

---

## 💡 Practical Application

### Auto-Trigger Example

```markdown
User: "I want cards to scale up on hover"

Skill auto-triggers →

"From a Progressive Enhancement perspective, this can be achieved with CSS transform:

    ```css
    .card {
      transition: transform 0.3s;
    }

    .card:hover {
      transform: scale(1.05);
    }
    ```

No JavaScript needed."
```

### Common Suggestion Patterns

1. **Layout questions**
   - "Let's consider if Grid/Flexbox can solve this"

2. **Animation questions**
   - "Would CSS transition be sufficient?"

3. **State management questions**
   - "We can manage state with :checked or :has()"

4. **Responsive questions**
   - "Let's start with Media Queries"

---

## 📚 Related Principles

- **Occam's Razor**: Prioritize simple solutions
- **YAGNI**: Don't implement until truly needed
- **Outcome-First**: Prioritize outcomes over architecture

---

## ✨ Key Takeaways

1. **CSS-First**: Consider CSS solutions first
2. **JavaScript-Last**: Only when truly necessary
3. **Native-First**: Leverage browser native features (`<details>`, `:has()`, etc.)
4. **Progressive**: Start simple, enhance as needed

---

**Remember**: "The best code is code that doesn't need to exist"
