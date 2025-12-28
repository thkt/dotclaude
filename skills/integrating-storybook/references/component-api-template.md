# Component API Template

Component API template added to the `## 4. UI Specification` section of spec.md.

## Template Structure

```markdown
### 4.x Component API: [ComponentName]

#### Description

[Component purpose and role in 1-2 sentences]

#### Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| children | ReactNode | ✓ | - | Content to display |
| variant | 'primary' \| 'secondary' | - | 'primary' | Visual style variant |
| size | 'sm' \| 'md' \| 'lg' | - | 'md' | Size of the component |
| disabled | boolean | - | false | Disable interactions |
| className | string | - | - | Additional CSS classes |
| onClick | () => void | - | - | Click event handler |

#### Variants

**variant**
- `primary`: Primary action style - bold, attention-grabbing
- `secondary`: Secondary action style - subtle, less prominent

**size**
- `sm`: Small (32px height) - compact spaces
- `md`: Medium (40px height) - default for most use cases
- `lg`: Large (48px height) - prominent actions

#### States

| State | Description | Visual Change |
| --- | --- | --- |
| default | Normal state | Base styling |
| hover | Mouse hover | Slightly lighter background |
| active | Being pressed | Darker background |
| focus | Keyboard focus | Focus ring |
| disabled | Non-interactive | Reduced opacity, no cursor |
| loading | Async operation | Spinner icon, disabled |

#### Usage Examples

\`\`\`tsx
// Basic usage
<Button onClick={handleClick}>Click me</Button>

// Primary variant (default)
<Button variant="primary">Submit</Button>

// Secondary variant
<Button variant="secondary">Cancel</Button>

// Large size
<Button size="lg">Large Button</Button>

// Disabled state
<Button disabled>Disabled</Button>

// With custom className
<Button className="my-custom-class">Styled</Button>
\`\`\`

#### Accessibility

- [ ] Keyboard navigation: focusable with Tab, activatable with Enter/Space
- [ ] ARIA attributes: aria-disabled when disabled
- [ ] Color contrast: WCAG AA compliant
- [ ] Focus indicator: visible focus ring
```

## Filled Example: Button Component

```markdown
### 4.1 Component API: Button

#### Description

Interactive button component for triggering actions.
Used for form submission, opening/closing dialogs, navigation, etc.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| children | ReactNode | ✓ | - | Button label text or content |
| variant | 'primary' \| 'secondary' \| 'ghost' | - | 'primary' | Visual style |
| size | 'sm' \| 'md' \| 'lg' | - | 'md' | Button size |
| disabled | boolean | - | false | Disabled state |
| loading | boolean | - | false | Loading state |
| fullWidth | boolean | - | false | Expand to parent width |
| type | 'button' \| 'submit' \| 'reset' | - | 'button' | HTML button type |
| onClick | () => void | - | - | Click event handler |

#### Variants

**variant**
- `primary`: Main action - blue background, white text
- `secondary`: Sub action - gray background, dark text
- `ghost`: Subtle action - transparent background, border only

**size**
- `sm`: Small (32px) - inline actions, in tables
- `md`: Medium (40px) - general use
- `lg`: Large (48px) - hero sections, important CTAs

#### States

| State | Description | Visual Change |
|-------|-------------|---------------|
| default | Normal state | Base styling |
| hover | On hover | Background slightly lighter |
| active | While clicking | Background slightly darker |
| focus | On focus | Blue focus ring |
| disabled | Disabled state | 50% opacity, cursor not-allowed |
| loading | Loading | Spinner displayed, not clickable |

#### Usage Examples

\`\`\`tsx
// Basic usage
<Button onClick={() => console.log('clicked')}>Click me</Button>

// Variants
<Button variant="primary">Submit</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">Learn more</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Saving...</Button>

// Form submission
<Button type="submit">Submit Form</Button>

// Full width
<Button fullWidth>Full Width Button</Button>
\`\`\`

#### Accessibility

- [x] Focusable with Tab key
- [x] Activatable with Enter/Space key
- [x] aria-disabled="true" when disabled
- [x] aria-busy="true" when loading
- [x] WCAG AA contrast ratio compliant
- [x] Visual focus indicator
```

## Filled Example: Card Component

```markdown
### 4.2 Component API: Card

#### Description

Container component for grouping and displaying related content.
Used for article previews, product cards, user profiles, etc.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| children | ReactNode | ✓ | - | Card content |
| variant | 'elevated' \| 'outlined' \| 'filled' | - | 'elevated' | Card style |
| padding | 'none' \| 'sm' \| 'md' \| 'lg' | - | 'md' | Inner padding |
| clickable | boolean | - | false | Whether clickable |
| onClick | () => void | - | - | Click event handler |
| href | string | - | - | Link URL (renders as <a> when specified) |

#### Variants

**variant**
- `elevated`: With shadow - default, appears floating
- `outlined`: With border - flat design, lighter feel
- `filled`: With background - gray background, clear separation

**padding**
- `none`: 0px - for custom layouts
- `sm`: 12px - compact display
- `md`: 16px - standard padding
- `lg`: 24px - spacious padding

#### States

| State | Description | Visual Change |
|-------|-------------|---------------|
| default | Normal state | Base styling |
| hover | On hover (clickable=true) | Shadow intensifies |
| focus | On focus | Focus ring |

#### Usage Examples

\`\`\`tsx
// Basic usage
<Card>
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</Card>

// Variants
<Card variant="elevated">Elevated Card</Card>
<Card variant="outlined">Outlined Card</Card>
<Card variant="filled">Filled Card</Card>

// Clickable
<Card clickable onClick={() => navigate('/detail')}>
  Click me to navigate
</Card>

// As link
<Card href="/product/123">
  View Product
</Card>

// No padding (custom layout)
<Card padding="none">
  <img src="..." className="w-full" />
  <div className="p-4">Content</div>
</Card>
\`\`\`

#### Accessibility

- [x] role="button" or <a> tag when clickable
- [x] Focusable with Tab key (when clickable/href)
- [x] Activatable with Enter/Space key
- [x] Visual focus indicator
```

## Template Variables

| Variable | Description | Example |
| --- | --- | --- |
| `[ComponentName]` | Component name (PascalCase) | `Button`, `Card` |
| `[Description]` | 1-2 sentence description | "Interactive button for..." |
| Props table | Markdown table | See above |
| Variants section | Variant descriptions | See above |
| States table | State list | See above |
| Usage Examples | TSX code block | See above |
| Accessibility | Checklist | See above |

## Generation Rules

### Props Table

1. **Required first**: List required Props first
2. **Alphabetical**: Alphabetical order within same Required level
3. **children first**: children always first
4. **handlers last**: onClick etc. handlers last

### Variants Section

1. **One subsection per variant prop**: variant, size, etc.
2. **List all options**: Document all choices
3. **Include default**: Explicitly show default value

### Usage Examples

1. **Basic first**: Simplest usage example first
2. **Progressive complexity**: Gradually add complex examples
3. **Cover all variants**: Cover all variations
4. **Real-world context**: Show practical context

## Parsing Hints

Hints for parsing from spec.md:

```typescript
// Detect Component API section
const componentApiRegex = /### \d+\.\d+ Component API: (\w+)/;

// Parse Props table
const propsTableRegex = /\| Prop \| Type \| Required \| Default \| Description \|[\s\S]*?(?=####|$)/;

// Detect Variants section
const variantsRegex = /#### Variants[\s\S]*?(?=####|$)/;
```
