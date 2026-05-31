# Aggregation Tuning

`/audit` Multi-run Aggregation で line-range tolerance を ±3 に決めた経験的根拠。

The ±3 line tolerance was chosen empirically: a strict key yielded ~3% merge rate on a 2-run diagnostic; ±3 with the normalization above lifted this to ~33% (10× improvement). Tighter (±1) under-merges legitimate same-issue findings; broader (±5+) risks false merges across distinct issues at nearby lines. If observed false merges rise, tighten to ±1 or require range overlap only.
