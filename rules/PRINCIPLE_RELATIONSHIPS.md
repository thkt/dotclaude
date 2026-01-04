# Principle Relationships

Understanding how principles relate and build upon each other enables consistent application.

## Dependency Graph

```mermaid
graph TD
    %% Meta principle at top
    OR[Occam's Razor<br/>Meta Principle<br/>'Simplest solution wins']

    %% Level 1: Universal principles
    OR -->|informs| PE[Progressive<br/>Enhancement<br/>'Build simple<br/>→ enhance']
    OR -->|informs| RC[Readable Code<br/>'Code for<br/>humans']
    OR -->|informs| DRY[DRY<br/>"Don't Repeat<br/>Yourself"]

    %% Principles supporting Readable Code
    RC -->|supported by| ML[Miller's Law<br/>'7±2 cognitive<br/>limit']

    %% Level 2: Applied practices (from Progressive Enhancement)
    PE -->|informs| TDD[TDD/Baby Steps<br/>'Red-Green-<br/>Refactor']

    %% Level 2: Applied practices (from Readable Code & DRY)
    RC -->|informs| CP[Container/<br/>Presentational<br/>'Separate logic<br/>from UI']
    DRY -->|informs| TIDY[TIDYINGS<br/>'Clean as<br/>you go']

    %% SOLID as separate tier
    SOLID[SOLID<br/>Principles<br/>'Design for<br/>change']
    OR -->|balances| SOLID
    SOLID -->|informs| CP
    SOLID -->|informs| LOD[Law of Demeter<br/>'Only talk to<br/>immediate friends']

    %% Leaky Abstraction
    OR -->|accepts| LA[Leaky<br/>Abstraction<br/>'Pragmatic over<br/>perfect']

    %% Styling for different principle types
    classDef metaPrinciple fill:#ff6b6b,stroke:#c92a2a,stroke-width:3px,color:#fff
    classDef universalPrinciple fill:#4dabf7,stroke:#1971c2,stroke-width:2px,color:#fff
    classDef appliedPractice fill:#51cf66,stroke:#2f9e44,stroke-width:2px,color:#fff
    classDef contextual fill:#ffd43b,stroke:#fab005,stroke-width:2px,color:#000
    classDef scientific fill:#e599f7,stroke:#ae3ec9,stroke-width:2px,color:#fff

    class OR metaPrinciple
    class PE,RC,DRY universalPrinciple
    class TDD,CP,TIDY,LOD,LA appliedPractice
    class SOLID contextual
    class ML scientific
```

## Graph Legend

| Color  | Type             | Description                              |
| ------ | ---------------- | ---------------------------------------- |
| Red    | Meta Principle   | Occam's Razor - questions all complexity |
| Blue   | Universal        | Applied by default to all decisions      |
| Green  | Applied Practice | Concrete implementation patterns         |
| Yellow | Contextual       | Applied when situation demands           |
| Purple | Scientific       | Backed by cognitive science              |

## Key Relationships

| #   | Relationship                                 | Explanation                                                   |
| --- | -------------------------------------------- | ------------------------------------------------------------- |
| 1   | **Occam's Razor → All**                      | Meta principle that questions all complexity                  |
| 2   | **Occam's Razor → Progressive Enhancement**  | Start simple, add complexity only when needed                 |
| 3   | **Occam's Razor → DRY**                      | Balance abstraction (DRY) vs simplicity (Occam)               |
| 4   | **Occam's Razor ⟷ SOLID**                    | Balance: SOLID for structure, Occam prevents over-engineering |
| 5   | **Progressive Enhancement → TDD/Baby Steps** | Both emphasize incremental development                        |
| 6   | **Readable Code → Miller's Law**             | Cognitive science backing for readability limits (7±2 items)  |
| 7   | **SOLID → Container/Presentational**         | SRP (Single Responsibility) drives UI/logic separation        |
| 8   | **SOLID → Law of Demeter**                   | Both manage dependencies and coupling                         |
| 9   | **Readable Code + DRY → TIDYINGS**           | Practical application of keeping code clean                   |
| 10  | **Occam's Razor → Leaky Abstraction**        | Accept imperfect abstractions for simplicity                  |

## How to Use This Graph

1. **Starting Point**: Begin with Occam's Razor (red) for every decision
2. **Build Up**: Apply universal principles (blue) - Progressive Enhancement, Readable Code, DRY
3. **Implement**: Use applied practices (green) - TDD, Container/Presentational, TIDYINGS
4. **Specific Context**: Apply contextual principles (yellow) - SOLID, Law of Demeter only when needed
5. **Resolve Conflicts**: When principles conflict, trace back to Occam's Razor at the top

## Development Practices

Detailed implementation guides for each practice:

| Practice                 | File                                                                                    | Focus                     |
| ------------------------ | --------------------------------------------------------------------------------------- | ------------------------- |
| Progressive Enhancement  | [@./development/PROGRESSIVE_ENHANCEMENT.md](./development/PROGRESSIVE_ENHANCEMENT.md)   | CSS-first, outcome-driven |
| Readable Code            | [@./development/READABLE_CODE.md](./development/READABLE_CODE.md)                       | Clarity over cleverness   |
| TDD/RGRC                 | [@./development/TDD_RGRC.md](./development/TDD_RGRC.md)                                 | Red-Green-Refactor cycle  |
| Container/Presentational | [@./development/CONTAINER_PRESENTATIONAL.md](./development/CONTAINER_PRESENTATIONAL.md) | UI/logic separation       |
| Law of Demeter           | [@./development/LAW_OF_DEMETER.md](./development/LAW_OF_DEMETER.md)                     | Minimal coupling          |
| Leaky Abstraction        | [@./development/LEAKY_ABSTRACTION.md](./development/LEAKY_ABSTRACTION.md)               | Pragmatic abstractions    |
| TIDYINGS                 | [@./development/TIDYINGS.md](./development/TIDYINGS.md)                                 | Micro-improvements        |

## Related Documentation

- [@./PRINCIPLES_GUIDE.md](./PRINCIPLES_GUIDE.md) - Complete principles guide
- [@./development/](./development/) - Individual principle files
