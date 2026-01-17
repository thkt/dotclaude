import type { Rule, Violation } from "../core/types";

const ERROR_ISSUES = [
  {
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
    what: "空の catch ブロックを検出",
    why: "エラーを握りつぶしている。問題の発見が遅れる",
    failure: "最低限 console.error でログ出力。本番では Sentry 等に送信",
    severity: "high" as const,
  },
  {
    pattern: /catch\s*\([^)]*\)\s*\{\s*\/\/.*\s*\}/g,
    what: "コメントのみの catch ブロックを検出",
    why: "エラー処理が意図的に省略されている。デバッグ困難に",
    failure: "コメントで省略理由を明記し、最低限のログ出力を追加",
    severity: "medium" as const,
  },
  {
    pattern: /\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g,
    what: "空の Promise catch を検出",
    why: "非同期エラーを握りつぶしている。サイレントフェイルの原因",
    failure: "エラーハンドリングを追加。無視する場合は理由をコメント",
    severity: "high" as const,
  },
  {
    pattern: /\.catch\s*\(\s*\(\s*\)\s*=>\s*null\s*\)/g,
    what: "null を返す Promise catch を検出",
    why: "エラー時に null を返すと、呼び出し側で予期しない動作を招く",
    failure: "Result 型パターンを使用するか、明示的なエラー型を返す",
    severity: "medium" as const,
  },
];

const rule: Rule = {
  name: "error-handling",
  filePattern: /\.(tsx?|jsx?)$/,
  check(content: string, filePath: string): Violation[] {
    const violations: Violation[] = [];

    for (const issue of ERROR_ISSUES) {
      if (issue.pattern.test(content)) {
        violations.push({
          rule: "error-handling",
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
