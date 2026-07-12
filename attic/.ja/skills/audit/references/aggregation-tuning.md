# 集約チューニング

`/audit` の Multi-run 集約で line-range tolerance を ±3 に決めた経験的根拠。

±3 行 tolerance は経験則で選んだ。厳格キーは 2-run 診断で merge 率約 3% にとどまり、SKILL.md の集約の正規化付き ±3 で約 33% (10 倍向上) に上がった。タイト (±1) では同一 issue の正当な findings が under-merge になり、広い (±5+) は近接行の別 issue を false merge するリスクがある。観測された false merge が増えたら ±1 にタイトにするか、range overlap のみを要求する。
