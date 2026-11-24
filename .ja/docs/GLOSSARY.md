# Glossary

このプロジェクトのユビキタス言語辞書。

📌 [English version](../../docs/GLOSSARY.md)

## ドキュメント

| 用語 | 正式名称        | 用途           | 生成元 | 読み手 | ライフサイクル |
| ---- | --------------- | -------------- | ------ | ------ | -------------- |
| DR   | Decision Record | 技術判断の記録 | `/dr`  | 人間   | 受理後は不変   |

### DR. Decision Record

答えること:「なぜこのアプローチを選んだのか」

技術判断 (技術選定、アーキテクチャパターン、廃止、プロセス変更) の根拠を記録する。MADR 形式の prose スタイルで書き、数か月から数年後に文脈を理解する必要がある人間の読者に最適化する。すべての判断がアーキテクチャに限るわけではないため、Architecture に限定せず Decision Record として記録する。

#### 主な特性

- 読み手は将来の開発者。プロジェクトに加わった人が DR を読むことで過去の判断を理解できる
- 受理後は不変。新たな DR で置換されるが、編集はしない
- テンプレートは MADR 1 枚。判断種別 (technology-selection, architecture-pattern, deprecation, process-change) の差は、そのテンプレート内のトピック表で表す

配置: `DR_HOME` があれば `$DR_HOME/<repo 名>/NNNN-title.md`、なければ `docs/decisions/NNNN-title.md`

## 関連

- [DESIGN](./DESIGN.md). アーキテクチャ概要
- [HOOKS](./HOOKS.md). フックパイプライン
