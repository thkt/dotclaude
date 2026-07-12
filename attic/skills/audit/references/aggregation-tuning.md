# Aggregation Tuning

Empirical rationale for the ±3 line-range tolerance in /audit Multi-run Aggregation.

The ±3 line tolerance was chosen empirically. A strict key yielded ~3% merge rate on a 2-run diagnostic; ±3 with the Aggregation normalization in SKILL.md lifted this to ~33% (10× improvement). Tighter (±1) under-merges legitimate same-issue findings; broader (±5+) risks false merges across distinct issues at nearby lines. If observed false merges rise, tighten to ±1 or require range overlap only.
