/// <reference types="node" />
// Shared, `_`-prefixed input-list generator for hooks/_lib/tests/fixtures/command-scan-tokens.json,
// the frozen table command-scan-corpus.test.ts and command-scan-tokens.test.ts both check
// command_scan.ts's commands_with_env() against. Follows the same `_`-prefix, no-.ja-mirror
// shape as hooks/_lib/tests/_hook-harness.ts and workflows/_lib/tests/_retirement.ts: a pure
// helper other test files import from, not a test file of its own.
//
// commandScanCorpus() is the one derivation the frozen-behavior test
// (command-scan-corpus.test.ts) and command-scan-tokens.test.ts both read, so the input list is
// never hand-enumerated twice. It concatenates three products plus the curated set the
// unit's contract names:
//   - lexicalCases(): the 14 special characters `( ) ; < > | & # \ ' " space newline
//     line-continuation`, each in the 7 placements a shlex-based scanner treats differently
//     (unquoted / inside single quotes / inside double quotes / right after a backslash / at a
//     token's head / at a token's tail / next to another punctuation character) -- 98 cases.
//   - heredocCases(): the 5 heredoc marker forms `<<EOF`, `<<-EOF`, `<<'EOF'`, `<<"EOF"`, and a
//     marker that only looks real inside quotes, each with and without a closing line -- 10
//     cases.
//   - resolveCases(): WRAPPERS x 3 forms, EXEC_FLAGS x 3 forms, and 4 env-assignment forms
//     that _resolve() in command_scan.ts reads -- 40 cases.
//   - curatedCases(): every command string hooks/_lib/tests/command_scan_test.py and the 3
//     security hook tests (hooks/security/tests/npm_install_guard_test.py,
//     hooks/security/tests/rm_to_trash_test.py, hooks/security/tests/git_sandbox_guard_test.py)
//     assert against, so the frozen table also locks in the cases those suites already cover.
//     Copied by hand from those four files rather than parsed out of them: the Python source is
//     canonical, so a command string added to one of those suites needs the same addition here.
import { EXEC_FLAGS, WRAPPERS } from "../command_scan.ts";

/** One corpus input: a name for the frozen table row, and the raw command text a hook would
 * receive as its Bash tool_input.command. */
export interface CorpusCase {
  readonly name: string;
  readonly command: string;
}

/** The 14 special characters the contract names, in the order used to name lexicalCases(). */
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

/** A name-safe label per entry of SPECIAL_CHARACTERS, same order, for lexicalCases() row names. */
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

/** The 7 placements the contract names, in the order used to name lexicalCases(). */
const PLACEMENTS: readonly string[] = [
  "unquoted",
  "single-quoted",
  "double-quoted",
  "after-backslash",
  "token-head",
  "token-tail",
  "adjacent-punctuation",
];

/** The 5 heredoc marker forms the contract names, in the order used to name heredocCases(). */
const HEREDOC_FORMS: readonly string[] = [
  "<<EOF",
  "<<-EOF",
  "<<'EOF'",
  '<<"EOF"',
  "quoted-fake-marker",
];

// One template per placement, building a raw command that puts `char` in that position around
// filler words ("alpha" / "beta") so a shlex-based scanner reads the surrounding tokens as
// ordinary text and the placement itself as the thing under test.
const LEXICAL_TEMPLATES: Readonly<Record<string, (char: string) => string>> = {
  unquoted: (char) => `echo alpha${char}beta`,
  // A literal quote char cannot sit directly inside its own quoting. Single quotes have no
  // escape of their own, so the standard shell workaround closes the quote, inserts an
  // unquoted backslash-quote (a literal quote character), and reopens the quote.
  "single-quoted": (char) =>
    char === "'" ? "echo 'alpha'\\''beta'" : `echo 'alpha${char}beta'`,
  // Double quotes do recognize backslash-quote as an escape, so the literal quote stays inside
  // one quoted span instead of needing the close/reopen trick.
  "double-quoted": (char) => (char === '"' ? 'echo "alpha\\"beta"' : `echo "alpha${char}beta"`),
  "after-backslash": (char) => `echo alpha\\${char}beta`,
  "token-head": (char) => `echo ${char}alphabeta`,
  "token-tail": (char) => `echo alphabeta${char}`,
  // Paired with a different punctuation character (never itself) so the two sit back to back
  // with nothing separating them.
  "adjacent-punctuation": (char) => {
    const other = char === ";" ? "|" : ";";
    return `echo alpha${char}${other}echo beta`;
  },
};

/** The special-character x placement product: 14 characters x 7 placements = 98 cases. */
export function lexicalCases(): CorpusCase[] {
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
  return cases;
}

function realHeredoc(marker: string, terminated: boolean): string {
  const lines = [`cat ${marker}`, "body line"];
  if (terminated) lines.push("EOF");
  lines.push("echo done");
  return lines.join("\n");
}

// _HEREDOC in command_scan.ts matches `<<` textually, with no quote-awareness, so a line that
// merely looks like a heredoc opener inside quotes (command_scan_test.py's T-016) still starts
// the same closing-line search. Terminated here finds a later line that happens to equal the
// looked-for marker; unterminated does not, so nothing is dropped (T-016's own case).
function fakeMarkerHeredoc(terminated: boolean): string {
  const lines = ["echo '<< END'", "some content"];
  if (terminated) lines.push("END");
  lines.push("echo done");
  return lines.join("\n");
}

/** The heredoc-form x terminated/unterminated product: 5 forms x 2 = 10 cases. */
export function heredocCases(): CorpusCase[] {
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
      // -n is in VALUED_WRAPPER_FLAGS: exercises the flag-value skip _resolve() runs before it
      // reaches the real command.
      return `${wrapper} -n root rm -rf /tmp/x`;
    case "absolute-path":
      // _resolve() reads Path(tokens[index]).name, so a wrapper written as a full path still
      // has to resolve by its basename.
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
      // Two -exec calls on one line: _resolve() recurses into the second rather than returning
      // the flag name as a command (command_scan_test.py's T-011).
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
    // ENV_ASSIGNMENT requires a leading letter/underscore and no space before `=`; this stays
    // the command name rather than reading as an assignment (command_scan_test.py's T-022).
    { name: "resolve env-assignment non-assignment-equals", command: "./a=b --flag" },
  ];
}

/** WRAPPERS x 3 forms, EXEC_FLAGS x 3 forms, and 4 env-assignment forms: 8*3 + 4*3 + 4 = 40
 * cases, covering what _resolve() in command_scan.ts reads ahead of the real command. */
export function resolveCases(): CorpusCase[] {
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

// Copied by hand from hooks/_lib/tests/command_scan_test.py's TestCommands (self.names() /
// command_scan.commands() calls only -- TestFlagValue / TestGitSubcommand / TestStartsWith /
// TestGitCleanOnlyLists take already-tokenized lists, not raw command text, and are the pure
// command-scan-pure.test.ts territory instead).
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

// T-028 (command_scan_test.py) asserts a continued and a joined form of these four read alike.
// The joined forms are derived rather than retyped, so a typo in one copy cannot mismatch it.
const CONTINUATION_EXAMPLES: readonly string[] = [
  "rm -rf \\\n  /tmp/x",
  'gh issue create --repo r \\\n  --title "[Bug] x"',
  "cat > /tmp/m.txt << 'EOF'\nbody\nEOF\ngit commit \\\n  -F /tmp/m.txt",
  "find . -type f \\\n  -exec rm {} \\;",
];

// Mirrors command_scan_test.py's T-028: `continued.replace("\\\n  ", " ").replace("\\\n", "")`.
// split/join rather than a regex, since the search text carries a backslash that would need
// escaping to use as a regex literal.
function joinContinuation(text: string): string {
  return text.split("\\\n  ").join(" ").split("\\\n").join("");
}

// Copied by hand from hooks/security/tests/npm_install_guard_test.py's assert_denied /
// assert_allowed / assert_empty calls.
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
  // test_project_npmrc_overrides_home builds `cd {project} && npm install zod` against a
  // temporary directory; a fixed placeholder path stands in for it here.
  "cd /tmp/project && npm install zod",
];

// Copied by hand from hooks/security/tests/rm_to_trash_test.py's assert_denied / assert_allowed
// calls, plus TestPrefilterCoversEveryVerb's `f"{verb} /tmp/x"` for each of VERBS
// (rm / rmdir / unlink / shred, already present below as the direct-deletion cases).
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

// Copied by hand from hooks/security/tests/git_sandbox_guard_test.py's assert_denied /
// assert_allowed calls.
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
  // TestTargetRepository: -C / --git-dir / --work-tree / GIT_DIR / GIT_WORK_TREE carry the call
  // into the fixture repository from any cwd; its path is a fresh tempdir per test run, so a
  // fixed placeholder stands in for it here.
  "git -C /tmp/guarded-repo checkout main",
  "git --git-dir=/tmp/guarded-repo/.git --work-tree=/tmp/guarded-repo checkout main",
  "git checkout main && git -C /tmp/guarded-repo checkout main",
  "GIT_DIR=/tmp/guarded-repo/.git GIT_WORK_TREE=/tmp/guarded-repo git checkout main",
  "GIT_DIR=/tmp/guarded-repo/.git GIT_WORK_TREE=/tmp/guarded-repo git status",
  "git -C /tmp/missing-repo checkout main",
];

/** Every command string command_scan_test.py and the 3 security hook tests assert against,
 * deduplicated by command text (several appear in more than one suite). */
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

/** The one derivation the frozen-behavior table and the differential test both read: the three
 * products the contract names, plus the curated cases the existing suites already cover. */
export function commandScanCorpus(): CorpusCase[] {
  return [...lexicalCases(), ...heredocCases(), ...resolveCases(), ...curatedCases()];
}
