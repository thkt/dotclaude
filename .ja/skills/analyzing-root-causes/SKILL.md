---
name: analyzing-root-causes
description: >
  5 Whys方法論によるソフトウェア問題の根本原因分析。
  トリガー: 根本原因, root cause, 5 Whys, なぜなぜ分析, 対症療法, patch,
  symptom, 症状, 表面的, workaround, ワークアラウンド, 本質的,
  応急処置, bandaid, quick fix.
allowed-tools: Read, Grep, Glob, Task
---

# 根本原因分析 - 5 Whys方法論

目標: 症状ではなく根本原因に対処して、問題を一度で適切に解決する。

## 症状 vs 根本原因

| タイプ | 例 | 結果 |
| --- | --- | --- |
| 症状修正 | DOMを待つためにsetTimeoutを追加 | 今は動くが、後で壊れる |
| 根本原因修正 | React refを適切に使用 | 恒久的な解決 |
| 症状修正 | 二重送信を防ぐフラグを追加 | 複雑性が増大 |
| 根本原因修正 | 送信中にボタンを無効化 | シンプルで信頼性が高い |

## セクションベースのロード

| セクション | ファイル | フォーカス | トリガー |
| --- | --- | --- | --- |
| 5 Whys | `references/five-whys.md` | 分析プロセス、テンプレート | 5 Whys, なぜなぜ |
| パターン | `references/symptom-patterns.md` | 一般的な症状→原因パターン | 対症療法, workaround |

## クイックチェックリスト

修正を実装する前に確認:

- [ ] これは症状を修正しているか、原因を修正しているか？
- [ ] この問題を完全に防ぐ方法は何か？
- [ ] よりシンプルな技術（HTML/CSS）で解決できるか？
- [ ] JavaScriptは本当に必要か？
- [ ] この修正は新たな複雑性を導入するか？

## 5 Whysプロセス

1. **Why** この問題が発生するのか？ → [観察可能な事実]
2. **Why** それが起こるのか？ → [実装詳細]
3. **Why** そうなっているのか？ → [設計決定]
4. **Why** それが存在するのか？ → [アーキテクチャ制約]
5. **Why** そのように設計されたのか？ → [根本原因]

### 分析例

**問題**: ボタンクリックでアクションが2回トリガーされる

1. **Why** 2回？ → クリックハンドラーが2回発火
2. **Why** ハンドラーが2回？ → クリック中にReactが再レンダリング
3. **Why** 再レンダリング？ → クリックハンドラー内のstate更新が再レンダリングを引き起こす
4. **Why** クリックでstate？ → stateであるべきでないものにstateを使用
5. **Why** stateを使用？ → **根本原因: 命令的アクションをリアクティブstateとして扱っている**

**解決**: 命令的フラグにはstateの代わりにrefを使用、またはボタンを適切に無効化

## 主要原則

| 原則 | 適用 |
| --- | --- |
| 予防 > パッチ | 最良の修正は問題を完全に防ぐ |
| シンプル > 複雑 | 根本原因の解決は通常よりシンプル |
| Whyを問う | 最初の答えを受け入れない |
| プログレッシブエンハンスメント | CSS/HTMLで解決できるか？ |

## 一般的な症状パターン

### タイミング問題

```typescript
// Bad: 症状: DOMを待つためのsetTimeout
useEffect(() => {
  setTimeout(() => { document.getElementById('target')?.scrollIntoView() }, 100)
}, [])

// Good: 根本原因: React refを使用
const targetRef = useRef<HTMLDivElement>(null)
useEffect(() => { targetRef.current?.scrollIntoView() }, [])
```

### 状態同期

```typescript
// Bad: 症状: 状態を同期する複数のeffect
useEffect(() => { setFilteredItems(items.filter(i => i.active)) }, [items])
useEffect(() => { setCount(filteredItems.length) }, [filteredItems])

// Good: 根本原因: 同期ではなく状態を導出
const filteredItems = useMemo(() => items.filter(i => i.active), [items])
const count = filteredItems.length
```

### 子状態のポーリング

```typescript
// Bad: 症状: 親が子の状態をポーリング
const childRef = useRef()
useEffect(() => {
  const interval = setInterval(() => { childRef.current?.getValue() }, 1000)
}, [])

// Good: 根本原因: 適切なデータフロー（状態のリフトアップまたはコールバック）
const [value, setValue] = useState()
return <Child onValueChange={setValue} />
```

## 参照

### コア原則

- [@../../../rules/development/PROGRESSIVE_ENHANCEMENT.md](../../rules/development/PROGRESSIVE_ENHANCEMENT.md) - シンプル優先
- [@../../../skills/applying-code-principles/SKILL.md](../../skills/applying-code-principles/SKILL.md) - 最もシンプルな解決

### 関連スキル

- `enhancing-progressively` - CSS優先アプローチが根本原因に対処することが多い
- `applying-code-principles` - 設計原則が根本原因の問題を防ぐ

### 使用エージェント

- `root-cause-reviewer` - このスキルの主要な使用者
