---
status: "accepted"
date: 2026-06-11
decision-makers: thkt
---

# ADR-0074: ADR テンプレートの単一 MADR テンプレートへの統合

## Context and Problem Statement

adr スキルは決定タイプ別に 4 つのテンプレート (technology-selection / architecture-pattern / process-change / deprecation、計 444 行 × EN/JA 2 ツリー) と、タイトルのキーワードからテンプレートを推奨する select-adr-template.sh を持っていた。しかし 4 テンプレートの必須セクションは MADR v4 コアで同一であり、差分は More Information 配下の推奨トピック表と例のみだった。74 本の実 ADR を実測したところ、More Information 使用は 16 本 (22%)、deprecation テンプレートが必須とする 7 トピックは使用 0 件で、タイプ別の差別化は機能していなかった。この構造は 4 ファイル維持のコストに見合うか。

## Decision Drivers

- 実測でテンプレート固有トピックがほぼ未使用 (最多はトピック表になく例にのみ存在した Reassessment Triggers の 10 件)
- select-adr-template.sh と SKILL.md のキーワード表が乖離していた (script に merge / rebase / gateway / monorepo 等がない)。同じ知識の二重管理
- テンプレート選択は意図判断であり、ADR-0006 が script 化の対象とする決定論的処理に該当しない
- JA canonical ミラー (ADR-0073) の下で 4 テンプレート × 2 ツリーの同期コスト

## Considered Options

- 単一 MADR テンプレート + タイプ別トピック表に統合し、select-adr-template.sh を削除
- standard + deprecation の 2 本に縮約
- 4 テンプレート維持、キーワード表の乖離のみ修正

## Decision Outcome

Chosen option: "単一 MADR テンプレート + タイプ別トピック表に統合し、select-adr-template.sh を削除", because 実測で差別化が機能しておらず、骨格の重複 (444 行 × 2 ツリー) とキーワード知識の二重管理を同時に解消できる。決定タイプは SKILL.md のキーワードトリガー表 (single source) で判定し、タイプ差は madr-template.md のトピック表 1 枚で表現する。

### Consequences

- Good, because テンプレート 8 ファイル + script 2 ファイルが 2 ファイルに減り、ミラー同期対象が縮小する
- Good, because キーワード表が SKILL.md に一元化され、乖離が構造的に再発しない
- Bad, because タイプ別の worked example が消え、移行計画つき deprecation ADR を書く際の足場が薄くなる

### Confirmation

skills/adr/templates/ に madr-template.md のみが存在し、SKILL.md の 6 フェーズプロセス Phase 2 に script 呼び出しがないことを目視確認する。validate-adr.sh による構造検証は従来どおり機能する。

## Pros and Cons of the Options

### 単一 MADR テンプレート + select-adr-template.sh 削除

- Good, because 同期・保守対象が最小化される
- Good, because LLM がタイプをキーワード表と意図で直接判定でき、Bash 往復が消える
- Bad, because タイプ別の完全な例を失う

### standard + deprecation の 2 本に縮約

- Good, because 廃止系決定の足場を温存できる
- Bad, because 実測 0 件使用のトピック群を温存し、構造が実態と乖離したままになる

### 4 テンプレート維持 + キーワード表のみ修正

- Good, because 変更リスクがない
- Bad, because 二重管理が残り、乖離が再発し得る

## More Information

ADR-0006 (決定論的処理の script 化) と ADR-0008 (audience-optimized templates の guideline + example 形式) は引き続き有効で、本決定はどちらも supersede しない。

### Trade-offs

タイプ別 worked example と引き換えに単一ファイルの保守性を取った。例は最頻用途の technology-selection 1 本を残した。

### Reassessment Triggers

- deprecation タイプの ADR で More Information トピックの不足が実際に問題化したら、deprecation 専用テンプレートの復活を検討する
- guideline + example 形式自体を変える場合は ADR-0008 の見直しとして別 ADR を起こす
