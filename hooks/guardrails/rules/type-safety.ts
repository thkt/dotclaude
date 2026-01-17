import type { Rule, Violation } from "../core/types";

const TYPE_ISSUES = [
  {
    pattern: /:\s*any\b/g,
    what: "any 型の使用を検出",
    why: "any は型安全性を完全に無効化。バグの温床になる",
    failure:
      "具体的な型を指定。不明な場合は unknown を使用し、型ガードで絞り込む",
    severity: "high" as const,
  },
  {
    pattern: /as\s+any\b/g,
    what: "as any によるキャストを検出",
    why: "型エラーを握りつぶしている。根本原因を隠蔽する",
    failure: "正しい型定義を行うか、型ガードを使用",
    severity: "high" as const,
  },
  {
    pattern: /@ts-ignore/g,
    what: "@ts-ignore を検出",
    why: "型エラーを無視している。将来のバグを招く",
    failure: "@ts-expect-error に変更し、理由をコメントで明記",
    severity: "medium" as const,
  },
  {
    pattern: /!\./g,
    what: "Non-null assertion (!) を検出",
    why: "実行時に null/undefined の可能性がある。クラッシュの原因に",
    failure: "Optional chaining (?.) とデフォルト値、または型ガードを使用",
    severity: "medium" as const,
  },
];

const rule: Rule = {
  name: "type-safety",
  filePattern: /\.tsx?$/,
  check(content: string, filePath: string): Violation[] {
    const violations: Violation[] = [];

    for (const issue of TYPE_ISSUES) {
      const matches = content.match(issue.pattern);
      if (matches) {
        violations.push({
          rule: "type-safety",
          severity: issue.severity,
          what: `${issue.what} (${matches.length} 件)`,
          why: issue.why,
          failure: issue.failure,
          file: filePath,
        });
      }
    }

    return violations;
  },
};

export default rule;
