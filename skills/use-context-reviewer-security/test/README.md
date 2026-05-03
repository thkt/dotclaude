# Test Harness for use-context-reviewer-security

reviewer-security の検出精度を客観評価するためのテストハーネス。
LLM の主観 confidence ではなく外部基準 (Recall / FP Rate) で精度を測る。

## Goal

| 指標 | 計算 | 意味 |
| --- | --- | --- |
| Recall | 検出された vuln-cases 数 / 全 vuln-cases 数 | 見逃し率の逆 |
| FP Rate | findings が出た safe-cases 数 / 全 safe-cases 数 | 過剰検出率 |
| Recall by category | カテゴリ別 (A01-A10) Recall | 軸別の弱点把握 |
| Diff from previous | results/ の前回ログとの差分 | 回帰検知 |

## Structure

```
test/
├── README.md            # この文書
├── expected.json        # 期待値定義 (検出すべき / 検出すべきでない)
├── cases/
│   ├── vuln/            # 検出されるべき (positive)
│   ├── safe/            # 検出されてはいけない (negative)
│   └── cross-file/      # 複数ファイル合わせて初めて検出される
└── results/             # 実行結果ログ (gitignored)
```

## Usage

現状は手動実行。runner は MVP 後に実装する。

1. `/audit test/cases/ --focus=security` を実行
2. 結果を `expected.json` と照合
3. `results/YYYY-MM-DD-recall.json` に Recall / FP Rate を記録

## expected.json schema

```json
[
  {
    "file": "cases/vuln/<name>.ts",
    "expected": "detected",
    "category": "A03",
    "severity_min": "high",
    "difficulty": "easy" | "hard" | "cross-file",
    "min_findings": 1,
    "note": "<任意の補足>"
  },
  {
    "file": "cases/safe/<name>.ts",
    "expected": "no_finding",
    "note": "<安全である理由>"
  }
]
```

`min_findings` は省略時 1。複数の独立した脆弱性が同一ファイルに含まれる場合のみ
明示する (例: cross-file/middleware.ts は matcher gap と unsigned cookie role の 2 件)。

`notes` (複数形) は `min_findings` の各件について何を期待しているかを列挙するときに使う。

## Attribution

cases の構成・難易度カテゴリの考え方は
[sabakan0123/claude-security-scan](https://github.com/sabakan0123/claude-security-scan)
(MIT) の `tests/security-skills/` を参考にしている。
コードは reviewer-security の検出パターン (OWASP A01-A10) に合わせて自前で書いた。
