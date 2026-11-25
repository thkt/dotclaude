/// <reference types="node" />
import { EXEC_FLAGS, WRAPPERS } from "../command_scan.ts";

export interface CorpusCase {
  readonly name: string;
  readonly command: string;
}

const SPECIAL_CHARACTERS: readonly string[] = [
  "(",
  ")",
  ";",
  "<",
  ">",
  "|",
  "&",
  "#",
  "\\",
  "'",
  '"',
  " ",
  "\n",
  "\\\n",
];

const CHAR_LABELS: readonly string[] = [
  "paren-open",
  "paren-close",
  "semicolon",
  "lt",
  "gt",
  "pipe",
  "amp",
  "hash",
  "backslash",
  "single-quote",
  "double-quote",
  "space",
  "newline",
  "line-continuation",
];

const PLACEMENTS: readonly string[] = [
  "unquoted",
  "single-quoted",
  "double-quoted",
  "after-backslash",
  "token-head",
  "token-tail",
  "adjacent-punctuation",
];

const HEREDOC_FORMS: readonly string[] = [
  "<<EOF",
  "<<-EOF",
  "<<'EOF'",
  '<<"EOF"',
  "quoted-fake-marker",
];

const LEXICAL_TEMPLATES: Readonly<Record<string, (char: string) => string>> = {
  unquoted: (char) => `echo alpha${char}beta`,
  "single-quoted": (char) =>
    char === "'" ? "echo 'alpha'\\''beta'" : `echo 'alpha${char}beta'`,
  "double-quoted": (char) => (char === '"' ? 'echo "alpha\\"beta"' : `echo "alpha${char}beta"`),
  "after-backslash": (char) => `echo alpha\\${char}beta`,
  "token-head": (char) => `echo ${char}alphabeta`,
  "token-tail": (char) => `echo alphabeta${char}`,
  "adjacent-punctuation": (char) => {
    const other = char === ";" ? "|" : ";";
    return `echo alpha${char}${other}echo beta`;
  },
};

function lexicalCases(): CorpusCase[] {
  const cases: CorpusCase[] = [];
  SPECIAL_CHARACTERS.forEach((char, charIndex) => {
    const label = CHAR_LABELS[charIndex];
    for (const placement of PLACEMENTS) {
      cases.push({
        name: `lexical ${label} ${placement}`,
        command: LEXICAL_TEMPLATES[placement](char),
      });
    }
  });
  cases.push({ name: "lexical hash after-punct", command: "echo alpha;#beta" });
  return cases;
}

function realHeredoc(marker: string, terminated: boolean): string {
  const lines = [`cat ${marker}`, "body line"];
  if (terminated) lines.push("EOF");
  lines.push("echo done");
  return lines.join("\n");
}

function fakeMarkerHeredoc(terminated: boolean): string {
  const lines = ["echo '<< END'", "some content"];
  if (terminated) lines.push("END");
  lines.push("echo done");
  return lines.join("\n");
}

function heredocCases(): CorpusCase[] {
  const cases: CorpusCase[] = [];
  for (const form of HEREDOC_FORMS) {
    for (const terminated of [true, false]) {
      const command =
        form === "quoted-fake-marker" ? fakeMarkerHeredoc(terminated) : realHeredoc(form, terminated);
      cases.push({
        name: `heredoc ${form} ${terminated ? "terminated" : "unterminated"}`,
        command,
      });
    }
  }
  return cases;
}

const WRAPPER_FORMS: readonly string[] = ["bare", "with-flag", "absolute-path"];

function wrapperCase(wrapper: string, form: string): string {
  switch (form) {
    case "bare":
      return `${wrapper} rm -rf /tmp/x`;
    case "with-flag":
      return `${wrapper} -n root rm -rf /tmp/x`;
    case "absolute-path":
      return `/usr/local/bin/${wrapper} rm -rf /tmp/x`;
    default:
      throw new Error(`unknown wrapper form: ${form}`);
  }
}

const EXEC_FLAG_FORMS: readonly string[] = ["single", "plus", "chained"];

function execFlagCase(flag: string, form: string): string {
  switch (form) {
    case "single":
      return `find . -name '*.tmp' ${flag} rm {} \\;`;
    case "plus":
      return `find . ${flag} rm {} +`;
    case "chained":
      return `find . ${flag} echo {} \\; ${flag} rm {} \\;`;
    default:
      throw new Error(`unknown exec flag form: ${form}`);
  }
}

function envAssignmentCases(): CorpusCase[] {
  return [
    { name: "resolve env-assignment single", command: "FOO=1 rm -rf x" },
    { name: "resolve env-assignment multiple", command: "FOO=1 BAR=2 npm install" },
    { name: "resolve env-assignment before-wrapper", command: "FOO=1 sudo rm -rf /tmp/x" },
    { name: "resolve env-assignment non-assignment-equals", command: "./a=b --flag" },
  ];
}

function resolveCases(): CorpusCase[] {
  const cases: CorpusCase[] = [];
  for (const wrapper of WRAPPERS) {
    for (const form of WRAPPER_FORMS) {
      cases.push({ name: `resolve wrapper ${wrapper} ${form}`, command: wrapperCase(wrapper, form) });
    }
  }
  for (const flag of EXEC_FLAGS) {
    for (const form of EXEC_FLAG_FORMS) {
      cases.push({ name: `resolve exec-flag ${flag} ${form}`, command: execFlagCase(flag, form) });
    }
  }
  cases.push(...envAssignmentCases());
  return cases;
}

const COMMAND_SCAN_TEST_COMMANDS: readonly string[] = [
  "cd /tmp && rm -rf x",
  "a; b | c",
  "cd /tmp\nrm -rf x",
  "cat > /tmp/m.txt << 'EOF'\ngh issue create --title x\nEOF\ngit commit -F /tmp/m.txt",
  "cat <<-END\nrm -rf /\nEND\necho done",
  "git commit -m 'see << EOF\nfor details'\nrm -rf x",
  "echo '<< END'\nrm -rf x",
  "git commit -m 'fix: 1 行目\n\ngh issue create を本文で説明する行'",
  "git commit -m 'remove rm calls'",
  "sed -i '' 's|rm -rf x|y|g' f",
  "sudo rm -rf /tmp/x",
  "env rm /tmp/x",
  "time rm -rf /tmp/x",
  "find . -print0 | xargs -0 rm",
  "sudo -u root rm x",
  "/bin/rm -rf /tmp/x",
  "find . -name '*.tmp' -exec rm {} \\;",
  "find . -execdir rm {} +",
  "find . -exec echo {} \\; -exec rm {} \\;",
  "echo 'unterminated",
  "FOO=1 rm -rf x",
  "FOO=1 BAR=2 npm install",
  "GH_TOKEN=x gh issue create",
  "FOO=1 gh issue create --title x",
  "./a=b --flag",
  "1FOO=x rm -rf y",
  "rm -rf \\\n  /tmp/x",
  "cp x \\\n  /some/dir/rm",
  'gh issue create --repo r \\\n  --title "[Bug] x"',
  'gh \\\n  issue create --title "[Bug] x"',
  "ec\\\nho hi",
  "git commit -m 'a \\\nb'",
  "cat > /tmp/m.txt << 'EOF'\nbody\nEOF\ngit commit \\\n  -F /tmp/m.txt",
  "find . -type f \\\n  -exec rm {} \\;",
];

const CONTINUATION_EXAMPLES: readonly string[] = [
  "rm -rf \\\n  /tmp/x",
  'gh issue create --repo r \\\n  --title "[Bug] x"',
  "cat > /tmp/m.txt << 'EOF'\nbody\nEOF\ngit commit \\\n  -F /tmp/m.txt",
  "find . -type f \\\n  -exec rm {} \\;",
];

function joinContinuation(text: string): string {
  return text.split("\\\n  ").join(" ").split("\\\n").join("");
}

const NPM_INSTALL_GUARD_TEST_COMMANDS: readonly string[] = [
  "npm install",
  "pnpm add zod",
  "yarn upgrade",
  "ni",
  "cd /tmp && npm install",
  "cd /tmp\nnpm install",
  "npm  install",
  "npm --prefix /tmp install",
  "npm --silent install",
  "npx create-vite my-app",
  "nlx create-vite my-app",
  "bunx create-vite my-app",
  "npm install --ignore-scripts=false",
  "npm install --no-ignore-scripts",
  "npm run build",
  "git status",
  "npm ls --depth=0",
  "git commit -m 'run npm install first'",
  "FOO=1 npm install zod",
  "pnpm dlx cowsay",
  "npm exec cowsay",
  "bun x cowsay",
  "yarn dlx cowsay",
  "npm install zod",
  "cd /tmp/project && npm install zod",
];

const RM_TO_TRASH_TEST_COMMANDS: readonly string[] = [
  "rm -rf /tmp/x",
  "rmdir /tmp/x",
  "unlink /tmp/x",
  "shred /tmp/x",
  "cd /tmp\nrm -rf x",
  "sudo rm -rf /tmp/x",
  "env rm /tmp/x",
  "time rm -rf /tmp/x",
  "/bin/rm -rf /tmp/x",
  'find . -name "*.tmp" -exec rm {} \\;',
  "find . -print0 | xargs -0 rm",
  "sed -i '' 's|rm -rf x|y|g' f",
  "git commit -m 'remove rm calls from the test'",
  "echo 'rm -rf danger' > note.txt",
  "cat > /tmp/m.txt << 'EOF'\nrm -rf /tmp/x\nEOF\ngit commit -F /tmp/m.txt",
  'rm -rf "/tmp/x',
  "git status",
  'find . -name "*.tmp" -delete',
  "git clean -fd",
  "git -C /tmp clean -fd",
  "git clean -n",
  "git clean -nd",
  "git clean --dry-run",
  'find . -name "*.tmp"',
  "FOO=1 rm -rf /tmp/x",
  "FOO=1 BAR=2 rm -rf /tmp/x",
];

const GIT_SANDBOX_GUARD_TEST_COMMANDS: readonly string[] = [
  "git checkout main",
  "git checkout -- agents/x.md",
  "git switch main",
  "git pull",
  "git pull --ff-only origin main",
  "git merge origin/main",
  "git rebase main",
  "git reset --hard origin/main",
  "git revert HEAD",
  "git cherry-pick abc1234",
  "git stash pop",
  "git restore agents/x.md",
  "git clean -fd",
  "git rm agents/x.md",
  "git mv agents/x.md agents/y.md",
  "git sparse-checkout set docs",
  "git sparse-checkout disable",
  "git rm --cached agents/x.md",
  "git rm -n agents/x.md",
  "git sparse-checkout list",
  "git checkout -b docs/foo",
  "git switch -c docs/foo",
  "git reset --mixed origin/main",
  "git reset --soft HEAD~1",
  "git stash list",
  "git fetch origin",
  "git status --short",
  "git diff --stat",
  "git push -u origin HEAD",
  'git commit -m "git pull を追加"',
  'echo "run git checkout main"',
  'git commit -m "unclosed',
  "ls -la",
  "gh pr list",
  "git checkout --help",
  "git stash --help",
  "git rm --help",
  "git apply --help",
  "git apply --check x.patch",
  "git apply --stat x.patch",
  "git apply x.patch",
  "git mv -n agents/a.md agents/b.md",
  "git mv --dry-run agents/a.md agents/b.md",
  "git mv agents/a.md agents/b.md",
  "git restore --staged agents/x.md",
  "git restore --staged --worktree agents/x.md",
  "git rebase --show-current-patch",
  "git rebase --abort",
  "git rm -- -h",
  "git checkout -- --help",
  "git bisect start",
  "git bisect good",
  "git bisect bad HEAD~3",
  "git bisect reset",
  "git bisect log",
  "git bisect view",
  "git bisect visualize",
  "git bisect terms",
  "git checkout-index -a -f",
  "git read-tree -u --reset HEAD~1",
  "git read-tree HEAD~1",
  "git write-tree",
  "git update-index --refresh",
  "git filter-branch --force --tree-filter true HEAD",
  "git -C /tmp/guarded-repo checkout main",
  "git --git-dir=/tmp/guarded-repo/.git --work-tree=/tmp/guarded-repo checkout main",
  "git checkout main && git -C /tmp/guarded-repo checkout main",
  "GIT_DIR=/tmp/guarded-repo/.git GIT_WORK_TREE=/tmp/guarded-repo git checkout main",
  "GIT_DIR=/tmp/guarded-repo/.git GIT_WORK_TREE=/tmp/guarded-repo git status",
  "git -C /tmp/missing-repo checkout main",
];

function curatedCases(): CorpusCase[] {
  const sources: ReadonlyArray<readonly [string, readonly string[]]> = [
    ["command_scan_test", COMMAND_SCAN_TEST_COMMANDS],
    ["npm_install_guard_test", NPM_INSTALL_GUARD_TEST_COMMANDS],
    ["rm_to_trash_test", RM_TO_TRASH_TEST_COMMANDS],
    ["git_sandbox_guard_test", GIT_SANDBOX_GUARD_TEST_COMMANDS],
  ];

  const seen = new Map<string, CorpusCase>();
  for (const [source, commands] of sources) {
    commands.forEach((command, index) => {
      if (!seen.has(command)) {
        seen.set(command, { name: `curated ${source} #${index}`, command });
      }
    });
  }
  for (const continued of CONTINUATION_EXAMPLES) {
    const joined = joinContinuation(continued);
    if (!seen.has(joined)) {
      seen.set(joined, {
        name: `curated command_scan_test joined-continuation of ${JSON.stringify(continued)}`,
        command: joined,
      });
    }
  }
  return [...seen.values()];
}

export function commandScanCorpus(): CorpusCase[] {
  return [...lexicalCases(), ...heredocCases(), ...resolveCases(), ...curatedCases()];
}
