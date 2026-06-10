# Mattpocock Skill Craft Patterns

Patterns distilled from mattpocock/skills (https://github.com/mattpocock/skills), the basis for the Craft axes in rules/conventions/SKILLS.md. Each pattern maps to a local axis. Pattern F (bold emphasis) is recorded but excluded because it violates MARKDOWN.md.

## Patterns

| ID  | Pattern                        | Source observation                                                                                                                                             | Local axis                   |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| A   | Description is the only signal | write-a-skill states the description is the only thing the agent sees when choosing. Third person, sentence 1 = capability, sentence 2 = "Use when [triggers]" | Description distinctiveness  |
| B   | One skill, one job             | grill-me is 10 lines. write-a-skill splits a SKILL.md past 100 lines                                                                                           | Single responsibility + size |
| C   | Imperative voice               | "Interview me", "Build the loop", "Do not proceed until X" address the agent directly                                                                          | Imperative voice             |
| D   | Phase + checklist + stop       | diagnose runs Phase 1-6 with `- [ ]` completion boxes and "Do not proceed to Phase 2 until you have a loop"                                                    | Verifiable completion        |
| E   | Calibration by example         | Good/Bad description pairs, Yes/Not contrasts, numeric thresholds (a 1% flake is not debuggable)                                                               | Concrete calibration         |
| F   | Bold for priority              | `**This is the skill.**` marks the load-bearing part                                                                                                           | Excluded (see below)         |
| G   | Progressive disclosure         | SKILL.md stays thin; REFERENCE.md / EXAMPLES.md hold detail; references one level deep                                                                         | Progressive disclosure       |

## Good / Bad pairs

### Description (axis A)

| Verdict | Example                                                                                                                           | Why                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Good    | "Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDFs, forms, or document extraction." | Names the capability plus concrete triggers    |
| Bad     | "Helps with documents."                                                                                                           | No way to distinguish it from other doc skills |

### Single responsibility (axis B)

| Verdict | Shape                                                    | Action                    |
| ------- | -------------------------------------------------------- | ------------------------- |
| Good    | description names one task and one trigger cluster       | Keep                      |
| Bad     | description joins unrelated capabilities with "and also" | Split into sibling skills |

### Verifiable completion (axis D)

| Verdict | Example                                             | Why                     |
| ------- | --------------------------------------------------- | ----------------------- |
| Good    | "Do not proceed until the loop reproduces the bug." | Checkable done-state    |
| Bad     | "Make sure the bug is fixed."                       | No checkable stop point |

## Bold conversion (pattern F)

mattpocock marks emphasis with bold. Under MARKDOWN.md, convert instead.

| Original                         | Convert to                                             |
| -------------------------------- | ------------------------------------------------------ |
| `**This is the skill.**` inline  | A dedicated `###` section or a leading table row       |
| `**Label:** value` list item     | A two-column table                                     |
| `**word**` mid-sentence emphasis | Drop the bold; rely on sentence structure and ordering |
