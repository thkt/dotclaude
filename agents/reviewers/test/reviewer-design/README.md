## Test Harness for reviewer-design

reviewer-design (deletion-test based module depth review) の検出精度を客観評価する。
LLM の主観 confidence ではなく外部基準 (Recall / FP Rate) で精度を測る。

## Goal

| 指標               | 計算                                      | 意味             |
| ------------------ | ----------------------------------------- | ---------------- |
| Recall             | 検出された shallow cases 数 / 全 shallow  | 見逃し率の逆     |
| FP Rate            | findings が出た deep cases 数 / 全 deep   | 過剰検出率       |
| Borderline outcome | borderline cases の検出有無               | 判定 line の確認 |
| Diff from previous | results/ の前回ログとの差分               | 回帰検知         |

## Structure

```
test/
├── README.md              # この文書
├── expected.json          # 期待値定義
├── cases/
│   ├── shallow/           # pass-through (REPORT 期待)
│   ├── deep/              # earns its weight (no_finding 期待)
│   └── borderline/        # 判定 line の calibration 用
└── results/               # 実行結果ログ (gitignored)
```

## Usage

現状は手動実行。runner は MVP 後に実装する。

1. reviewer-design agent を Task tool で起動 (target: cases/)
2. 結果を expected.json と照合
3. results/YYYY-MM-DD-baseline.json に Recall / FP Rate を記録

## expected.json schema

```json
[
  {
    "file": "cases/<group>/<name>.<ext>",
    "expected": "detected" | "no_finding",
    "category": "module-depth",
    "severity_min": "medium",
    "difficulty": "easy" | "borderline",
    "language": "ts" | "tsx" | "rust",
    "min_findings": 1,
    "note": "<deletion test の根拠>"
  }
]
```

`min_findings` は省略時 1。

## Deletion Test Rubric

各 case は以下の判定で shallow / deep を区別する。

| Question                                              | shallow signal              | deep signal                     |
| ----------------------------------------------------- | --------------------------- | ------------------------------- |
| Module を消したら caller 側で何が複製されるか         | 0 行 or 1 関数呼び出し      | 複数 hook / state / 検証 / 派生 |
| Interface が hide してる中身は何か                    | 中身そのもの (1:1 forward)  | 不変条件、順序、エラー処理      |
| 同じ interface で別実装に差し替え可能か               | yes (trivial substitute)    | no (中身が結合してる)           |

## Attribution

ハーネス構造は reviewer-security の test/ を参考にしている。
Deletion test の判定基準は John Ousterhout "A Philosophy of Software Design" の deep module 概念に依拠。
