# Principle Relationships Matrix

Consolidated cross-references between all principles to reduce duplication.

## Reference Principles

### Core Reference Principles

| Principle | Core Principles (Same Level) | Applied Practices |
|-----------|------------------------------|-------------------|
| **Occam's Razor** | SOLID (SRP simplicity)<br>DRY (eliminate duplication) | Progressive Enhancement<br>TDD/RGRC (Baby Steps)<br>Readable Code<br>Leaky Abstraction (simple over perfect) |
| **SOLID** | Occam's Razor (SRP simplicity)<br>DRY (prevent duplication)<br>Miller's Law (SRP cognitive limits) | TDD/RGRC (design via tests)<br>Law of Demeter |
| **DRY** | SOLID (abstractions via DIP)<br>Occam's Razor (single sources) | TDD/RGRC (tests reveal duplication)<br>Tidyings (remove incrementally) |
| **Miller's Law** | Occam's Razor (quantify simplicity)<br>SOLID (SRP cognitive alignment)<br>DRY (reduce mental load) | Readable Code (cognitive basis)<br>Container/Presentational (limit responsibilities) |
| **YAGNI** | Occam's Razor (simplest solution)<br>DRY (single source of truth) | Progressive Enhancement (build minimal)<br>TDD/RGRC (naturally enforces YAGNI) |

### Development Practices

| Practice | Core Principles | Related Practices |
|----------|----------------|-------------------|
| **TDD/RGRC** | Occam's Razor (Baby Steps simplicity) | Test Generation (systematic design) |
| **Progressive Enhancement** | Occam's Razor (simplicity first) | Leaky Abstraction (build progressively)<br>Law of Demeter (progressive coupling)<br>Readable Code (enhance gradually) |
| **Readable Code** | Miller's Law (cognitive limits)<br>Occam's Razor (simplicity enhances readability) | Law of Demeter (simpler interfaces)<br>Container/Presentational (clear separation) |
| **Law of Demeter** | SOLID (complements principles)<br>Occam's Razor (reduce complexity) | Container/Presentational (natural application)<br>Readable Code (improve readability) |
| **Leaky Abstraction** | Occam's Razor (simple over perfect)<br>SOLID (DIP accounts for leaks) | Progressive Enhancement (build progressively)<br>Law of Demeter (manage boundaries) |
| **Container/Presentational** | Miller's Law (limit responsibilities) | Law of Demeter (props-only pattern)<br>Readable Code (clear separation) |
| **Test Generation** | Occam's Razor (keep simple)<br>Miller's Law (limit complexity) | TDD/RGRC (test-first)<br>Readable Code (clarity in tests)<br>Progressive Enhancement (start simple, enhance coverage) |
| **AI-Assisted Development** | Occam's Razor (simplify AI suggestions)<br>DRY (AI finds duplication)<br>SOLID (human judgment) | TDD/RGRC (AI test scaffolding)<br>Readable Code (refine AI output)<br>Progressive Enhancement (start simple with AI) |

## Usage

Instead of repeating full "Related Principles" sections in each file, reference this matrix:

```markdown
## Related Principles

See: [@./PRINCIPLE_RELATIONSHIPS.md](./PRINCIPLE_RELATIONSHIPS.md#reference-principles)
- Specific note (if needed)
```

## Navigation

- **Reference Principles**: [@./reference/](./reference/) - Core concepts
- **Development Practices**: [@./development/](./development/) - Applied methods
- **Commands**: [@../docs/COMMANDS.md](../docs/COMMANDS.md) - Workflows
