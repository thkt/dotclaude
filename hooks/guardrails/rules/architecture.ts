import type { Rule, Violation } from "../core/types";

const LAYER_PATTERNS = {
  components: /\/components\//,
  hooks: /\/hooks\//,
  services: /\/services\//,
  utils: /\/utils\//,
  pages: /\/pages\//,
  features: /\/features\//,
};

const VIOLATIONS: Array<{
  from: keyof typeof LAYER_PATTERNS;
  importing: RegExp;
  what: string;
  why: string;
  failure: string;
}> = [
  {
    from: "utils",
    importing: /from\s+['"].*\/(components|hooks|pages|features)\//,
    what: "utils/ から UI レイヤー (components/hooks/pages/features) をインポート",
    why: "utils は純粋なユーティリティ関数のみ。UI 依存があると再利用性が下がる",
    failure: "インポートを削除するか、関数を適切なレイヤーに移動",
  },
  {
    from: "services",
    importing: /from\s+['"].*\/(components|hooks|pages)\//,
    what: "services/ から UI レイヤー (components/hooks/pages) をインポート",
    why: "services はビジネスロジック層。UI 依存があると単体テストが困難に",
    failure:
      "コールバック関数を引数として受け取るか、イベントを発火する設計に変更",
  },
  {
    from: "components",
    importing: /from\s+['"].*\/pages\//,
    what: "components/ から pages/ をインポート",
    why: "components は再利用可能な UI 部品。pages 依存があると再利用性がなくなる",
    failure: "必要なデータは props で渡す設計に変更",
  },
];

const rule: Rule = {
  name: "architecture-violation",
  filePattern: /\.(tsx?|jsx?)$/,
  check(content: string, filePath: string): Violation[] {
    const violations: Violation[] = [];

    for (const pattern of VIOLATIONS) {
      if (!LAYER_PATTERNS[pattern.from].test(filePath)) continue;
      if (pattern.importing.test(content)) {
        violations.push({
          rule: "architecture-violation",
          severity: "high",
          what: pattern.what,
          why: pattern.why,
          failure: pattern.failure,
          file: filePath,
        });
      }
    }

    return violations;
  },
};

export default rule;
