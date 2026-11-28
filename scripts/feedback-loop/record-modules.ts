// 生成元: thkt/feedback-loop scripts/build.ts。直接編集せず、正本を変更して再生成してください
// バージョン: 0.5.5
import { plugin } from 'bun';
import { afterAll } from 'bun:test';
import { appendFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join } from 'node:path';

// Bun 1.4.5のplugin()で読み込むモジュールをテストごとに記録します。
// onLoadはundefined返却を拒否するため、コードをUTF-8文字列とloaderで返します。

const recordDirVariable = 'FEEDBACK_LOOP_RECORD_DIR';
// テストファイルを起動した側が決めた持ち主です。子のbunは環境変数で引き継ぎます。
const recordOwnerVariable = 'FEEDBACK_LOOP_RECORD_TEST';

const recordedPattern = /^(?!.*[\\/]node_modules[\\/]).*\.(?:[cm]?[jt]sx?)$/;
const loaders = new Map<string, Bun.Loader>([
  ['ts', 'ts'],
  ['mts', 'ts'],
  ['cts', 'ts'],
  ['tsx', 'tsx'],
  ['js', 'js'],
  ['mjs', 'js'],
  ['cjs', 'js'],
  ['jsx', 'jsx'],
]);

export function recorderEnv(
  env: NodeJS.ProcessEnv,
  recordDir: string,
  preloadPath: string,
): NodeJS.ProcessEnv {
  if (/\s/.test(preloadPath)) {
    throw new Error(
      `BUN_OPTIONS cannot carry a recorder path with whitespace / 空白を含む記録器のパスは渡せません: ${preloadPath}`,
    );
  }
  const preload = `--preload=${preloadPath}`;
  const options = (env.BUN_OPTIONS ?? '').split(/\s+/).filter(Boolean);
  const next: NodeJS.ProcessEnv = {
    ...env,
    BUN_OPTIONS: [...options.filter((o) => o !== preload), preload].join(' '),
    [recordDirVariable]: recordDir,
  };
  delete next[recordOwnerVariable];
  return next;
}

export async function readRecords(recordDir: string): Promise<Map<string, Set<string>>> {
  const records = new Map<string, Set<string>>();
  for (const name of readdirSync(recordDir)) {
    if (!name.endsWith('.jsonl')) {
      continue;
    }
    const lines = readFileSync(join(recordDir, name), 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      const entry: unknown = JSON.parse(line);
      const pair: unknown[] = Array.isArray(entry) && entry.length === 2 ? entry : [];
      const [owner, module] = pair;
      if (typeof owner !== 'string' || typeof module !== 'string') {
        throw new Error(`Invalid record line in ${join(recordDir, name)}: ${line}`);
      }
      const modules = records.get(owner) ?? new Set<string>();
      modules.add(module);
      records.set(owner, modules);
    }
  }
  return records;
}

function register(recordDir: string) {
  mkdirSync(recordDir, { recursive: true });
  // 後からテストがnode:fsをmockしても、記録器の読み書きを製品のI/O観測へ混ぜません。
  const readModule = readFileSync;
  const appendRecord = appendFileSync;
  // 起動したテストファイルが決めた持ち主を子のbunが受け取った場合は、子が読むテストファイルで持ち主を変えません。
  const inherited = process.env[recordOwnerVariable];
  const recordFile = join(recordDir, `${process.pid}.jsonl`);
  const written = new Set<string>();
  let owner = inherited;

  const record = (path: string) => {
    if (owner !== undefined && isAbsolute(path) && !path.split(/[\\/]/).includes('node_modules')) {
      const line = JSON.stringify([owner, path]);
      if (!written.has(line)) {
        written.add(line);
        appendRecord(recordFile, `${line}\n`);
      }
    }
  };

  // JSONとTOMLはBun既定のloaderが読み、onLoadを通りません。テストの終わりに、読み込み済みのパスを記録します。
  const recordCachedData = () => {
    for (const path of Object.keys(createRequire(import.meta.url).cache)) {
      if (/\.(?:json|toml)$/.test(path)) {
        record(path);
      }
    }
  };
  // bun testの中で読み込まれたかを表します。持ち主にするのは、bun testが実行するテストファイルだけです。
  let inTestRunner = false;
  try {
    afterAll(() => {
      // 持ち主がないと記録が残らず、実行後の照合が原因を示さない診断で止まります。
      if (owner === undefined) {
        throw new Error(
          `No record owner for the running test file / 依存記録の持ち主を決められません: Bun.main=${Bun.main}, Bun ${Bun.version}`,
        );
      }
      recordCachedData();
    });
    inTestRunner = true;
  } catch (error) {
    // 同じpreloadを使う通常の子Bunにはテストのライフサイクルがありません。
    if (
      !(error instanceof Error) ||
      !error.message.startsWith('Cannot use afterAll() outside of the test runner.')
    ) {
      throw error;
    }
    process.on('exit', recordCachedData);
  }

  plugin({
    name: 'record-modules',
    setup(build) {
      build.onLoad({ filter: recordedPattern }, (args) => {
        const path = args.path;
        // Bun 1.4.5のbun testでは、Bun.mainが実行中のテストファイルを指します。文書にない挙動で、記録のテストが確かめます。
        // テストがimportする別のテストファイルは、持ち主にしません。
        if (inherited === undefined && inTestRunner && path === Bun.main) {
          owner = path;
          process.env[recordOwnerVariable] = path;
        }
        record(path);
        const loader = loaders.get(path.slice(path.lastIndexOf('.') + 1));
        if (loader === undefined) {
          throw new Error(`No loader for recorded module: ${path}`);
        }
        return { contents: readModule(path, 'utf8'), loader };
      });
    },
  });
}

const activeRecordDir = process.env[recordDirVariable];
if (activeRecordDir !== undefined && activeRecordDir !== '') {
  register(activeRecordDir);
}
