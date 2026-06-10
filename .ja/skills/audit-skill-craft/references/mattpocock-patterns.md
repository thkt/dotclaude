# Mattpocock Skill Craft Patterns

rules/conventions/SKILLS.md の Craft 軸の土台となった mattpocock/skills (https://github.com/mattpocock/skills) から蒸留したパターン。各パターンはローカルの軸に対応する。パターン F (bold 強調) は記録するが MARKDOWN.md に反するため除外する。

## Patterns

| ID  | パターン                       | 出典の観察                                                                                                                                    | ローカル軸                 |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| A   | Description is the only signal | write-a-skill は、agent が skill を選ぶとき見えるのは description だけだと述べる。三人称、1 文目 = capability、2 文目 = "Use when [triggers]" | description の識別性       |
| B   | One skill, one job             | grill-me は 10 行。write-a-skill は 100 行を超えた SKILL.md を分割する                                                                        | 単一責務 + サイズ          |
| C   | Imperative voice               | "Interview me"、"Build the loop"、"Do not proceed until X" は agent に直接呼びかける                                                          | 命令形                     |
| D   | Phase + checklist + stop       | diagnose は `- [ ]` 完了ボックス付きで Phase 1-6 を走らせ、"Do not proceed to Phase 2 until you have a loop" と書く                           | 検証可能な完了             |
| E   | Calibration by example         | Good/Bad の description ペア、Yes/Not の対比、数値しきい値 (例: 1% の flake はデバッグ不能)                                                   | 具体的なキャリブレーション |
| F   | Bold for priority              | `**This is the skill.**` が load-bearing な箇所を示す                                                                                         | 除外 (下記参照)            |
| G   | Progressive disclosure         | SKILL.md は薄く保ち、REFERENCE.md / EXAMPLES.md が詳細を持つ。references は 1 階層まで                                                        | progressive disclosure     |

## Good / Bad ペア

### Description (軸 A)

| Verdict | Example                                                                                                                           | Why                                    |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Good    | "Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDFs, forms, or document extraction." | capability と具体的なトリガーを示す    |
| Bad     | "Helps with documents."                                                                                                           | 他の doc 系 skill と区別する手段がない |

### 単一責務 (軸 B)

| Verdict | Shape                                                  | Action            |
| ------- | ------------------------------------------------------ | ----------------- |
| Good    | description が 1 つのタスクと 1 つのトリガー群を示す   | 維持              |
| Bad     | description が無関係な capability を "and also" で繋ぐ | 兄弟 skill に分割 |

### 検証可能な完了 (軸 D)

| Verdict | Example                                             | Why                        |
| ------- | --------------------------------------------------- | -------------------------- |
| Good    | "Do not proceed until the loop reproduces the bug." | チェック可能な完了状態     |
| Bad     | "Make sure the bug is fixed."                       | チェック可能な停止点がない |

## Bold 変換 (パターン F)

mattpocock は強調を bold で示す。MARKDOWN.md の下では代わりに変換する。

| 変換元                          | 変換先                                         |
| ------------------------------- | ---------------------------------------------- |
| `**This is the skill.**` inline | 専用の `###` セクション、または先頭の table 行 |
| `**Label:** value` list item    | 2 列の table                                   |
| `**word**` 文中の強調           | bold を外し、文構造と順序に委ねる              |
