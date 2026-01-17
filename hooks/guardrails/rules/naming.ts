import type { Rule, Violation } from "../core/types";

const NAMING_ISSUES = [
  {
    pattern: /const\s+[a-z][a-zA-Z]*\s*=\s*\([^)]*\)\s*=>/g,
    filePattern: /\/components\/.*\.tsx$/,
    what: "コンポーネントファイルで小文字始まりの関数を検出",
    why: "React コンポーネントは PascalCase で命名すべき。JSX で使用できない",
    failure: "関数名を PascalCase に変更 (例: myComponent → MyComponent)",
    severity: "medium" as const,
    additionalCheck: (content: string) => {
      // コンポーネントっぽい関数のみ検出 (JSX を返すもの)
      return /const\s+[a-z][a-zA-Z]*\s*=\s*\([^)]*\)\s*=>\s*[{(][\s\S]*</.test(
        content,
      );
    },
  },
  {
    pattern:
      /^(?!use)[a-z]+.*\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*useState|useEffect/m,
    filePattern: /\/hooks\/.*\.ts$/,
    what: "hooks/ 内で use プレフィックスなしの関数を検出",
    why: "カスタムフックは use プレフィックスが必須。React のルール違反",
    failure: "関数名を useXxx に変更",
    severity: "high" as const,
  },
  {
    pattern: /interface\s+[a-z]/g,
    what: "小文字始まりの interface を検出",
    why: "TypeScript の interface は PascalCase が慣習",
    failure: "interface 名を PascalCase に変更",
    severity: "low" as const,
  },
  {
    pattern: /type\s+[a-z][a-zA-Z]*\s*=/g,
    what: "小文字始まりの type を検出",
    why: "TypeScript の type alias は PascalCase が慣習",
    failure: "type 名を PascalCase に変更",
    severity: "low" as const,
  },
];

const rule: Rule = {
  name: "naming-convention",
  filePattern: /\.(tsx?|jsx?)$/,
  check(content: string, filePath: string): Violation[] {
    const violations: Violation[] = [];

    for (const issue of NAMING_ISSUES) {
      if (issue.filePattern && !issue.filePattern.test(filePath)) continue;
      if (issue.additionalCheck && !issue.additionalCheck(content)) continue;
      if (issue.pattern.test(content)) {
        violations.push({
          rule: "naming-convention",
          severity: issue.severity,
          what: issue.what,
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
