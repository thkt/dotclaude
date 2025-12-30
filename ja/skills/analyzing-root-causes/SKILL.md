---
name: analyzing-root-causes
description: >
  ソフトウェア問題の5 Whys手法による根本原因分析。
  Triggers: 根本原因, root cause, 5 Whys, なぜなぜ分析, 対症療法, patch,
  symptom, 症状, 表面的, workaround, ワークアラウンド, 本質的,
  応急処置, bandaid, quick fix.
allowed-tools: Read, Grep, Glob, Task
---

# 根本原因分析 - 5 Whys手法

目標: 症状ではなく根本原因に対処し、問題を一度で適切に解決する。

## 症状 vs 根本原因

| タイプ | 例 | 結果 |
| --- | --- | --- |
| 症状の修正 | DOMを待つためにsetTimeoutを追加 | 今は動く、後で壊れる |
| 根本原因の修正 | React refを適切に使用 | 恒久的な解決 |
| 症状の修正 | 二重送信を防ぐフラグを追加 | 複雑さが増す |
| 根本原因の修正 | 送信中にボタンを無効化 | シンプルで信頼性がある |

## セクション別ロード

| セクション | ファイル | フォーカス | トリガー |
| --- | --- | --- | --- |
| 5 Whys | `references/five-whys.md` | 分析プロセス、テンプレート | 5 Whys, なぜなぜ |
| パターン | `references/symptom-patterns.md` | よくある症状→原因パターン | 対症療法, workaround |

## クイックチェックリスト

修正を実装する前に確認:

- [ ] これは症状を修正しているのか、原因を修正しているのか？
- [ ] この問題を完全に防ぐには何が必要か？
- [ ] よりシンプルな技術（HTML/CSS）で解決できないか？
- [ ] ここで本当にJavaScriptが必要か？
- [ ] この修正は新たな複雑さを導入しないか？

## 5 Whysプロセス

1. **なぜ**この問題が発生するのか？ → [観察可能な事実]
2. **なぜ**それが起こるのか？ → [実装の詳細]
3. **なぜ**そうなっているのか？ → [設計上の決定]
4. **なぜ**それが存在するのか？ → [アーキテクチャ上の制約]
5. **なぜ**そのように設計されたのか？ → [根本原因]

### 分析例

**問題**: ボタンクリックがアクションを2回トリガーする

1. **なぜ**2回？ → クリックハンドラが2回発火
2. **なぜ**2回ハンドラ？ → クリック中にReactが再レンダリング
3. **なぜ**再レンダリング？ → クリックハンドラ内の状態更新が再レンダリングを引き起こす
4. **なぜ**クリック内で状態？ → 状態であるべきでないものに状態を使用
5. **なぜ**状態を使用？ → **根本原因: 命令的アクションをリアクティブ状態として扱っている**

**解決策**: 命令的フラグにはstateではなくrefを使用、またはボタンを適切に無効化

## キー原則

| 原則 | 適用 |
| --- | --- |
| 予防 > パッチ | 最良の修正は問題を完全に防ぐ |
| シンプル > 複雑 | 根本原因の解決策は通常よりシンプル |
| なぜを問う | 最初の答えを受け入れない |
| 段階的強化 | CSS/HTMLで解決できないか？ |

## よくある症状パターン

### タイミング問題

```typescript
// Bad: 症状: DOMを待つためにsetTimeout
useEffect(() => {
  setTimeout(() => { document.getElementById('target')?.scrollIntoView() }, 100)
}, [])

// Good: 根本原因: React refを使用
const targetRef = useRef<HTMLDivElement>(null)
useEffect(() => { targetRef.current?.scrollIntoView() }, [])
```

### 状態同期

```typescript
// Bad: 症状: 状態を同期するための複数のeffect
useEffect(() => { setFilteredItems(items.filter(i => i.active)) }, [items])
useEffect(() => { setCount(filteredItems.length) }, [filteredItems])

// Good: 根本原因: 同期ではなく導出
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

// Good: 根本原因: 適切なデータフロー（状態の持ち上げまたはコールバック）
const [value, setValue] = useState()
return <Child onValueChange={setValue} />
```

## 参照

### コア原則

- [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](../../../rules/development/PROGRESSIVE_ENHANCEMENT.md) - シンプルが先
- [@~/.claude/skills/applying-code-principles/SKILL.md](../../../skills/applying-code-principles/SKILL.md) - 最もシンプルな解決策

### 関連スキル

- `enhancing-progressively` - CSS-firstアプローチはしばしば根本原因に対処
- `applying-code-principles` - 設計原則が根本原因の問題を防ぐ

### 使用するエージェント

- `root-cause-reviewer` - このスキルの主な利用者
