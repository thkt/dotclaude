---
name: progressive-enhancement
description: >
  Progressive Enhancement guide with CSS-first approach auto-suggestions.
  Triggers on keywords: "レイアウト (layout)", "スタイル (style)", "位置 (position)",
  "アニメーション (animation)", "表示/非表示 (show/hide)", "レスポンシブ (responsive)", etc.
  Suggests CSS solutions before JavaScript, promoting simple and maintainable implementations.
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
---

# Progressive Enhancement - CSS優先開発

## 🎯 コア哲学

**「最良のコードは、存在しないコード」** - CSSで解決できるなら、JavaScriptは不要

### 優先順位

1. **HTML** - 構造とセマンティクス
2. **CSS** - ビジュアル表現とレイアウト
3. **JavaScript** - 本当に必要な場合のみ

---

## 🎨 CSS優先ソリューション

### レイアウト

#### Grid

```css
/* ✅ CSS Grid オーバーレイ */
.container {
  display: grid;
}

.background, .foreground {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
}

/* ❌ JavaScriptは不要: position: absolute を避ける */
```

**使用例**:

- モーダルオーバーレイ
- カード上のバッジ配置
- 背景画像と前景コンテンツの重ね合わせ

#### Flexbox

```css
/* ✅ 中央揃え */
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* ❌ JavaScriptは不要: 手動計算と位置設定 */
```

---

### 位置

```css
/* ✅ Transform - リフローなし */
.move-up {
  transform: translateY(-10px);
  transition: transform 0.3s;
}

/* ❌ top/left は避ける (リフローを引き起こす) */
.move-up-bad {
  position: relative;
  top: -10px;  /* リフローをトリガー */
}
```

**パフォーマンス**:

- `transform`: GPU アクセラレーション、リフローなし
- `top/left/margin`: CPU レンダリング、リフローを引き起こす

---

### 表示/非表示

```css
/* ✅ アニメーション用に visibility/opacity */
.hidden {
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.3s, visibility 0s 0.3s;
}

.visible {
  visibility: visible;
  opacity: 1;
  transition: opacity 0.3s;
}

/* ❌ display: none は即座に消えて、アニメーションなし */
```

---

### レスポンシブ

#### Media Queries

```css
/* ✅ モバイルファースト */
.component {
  /* モバイルデフォルトスタイル */
  flex-direction: column;
}

@media (min-width: 768px) {
  .component {
    flex-direction: row;
  }
}

/* ❌ JavaScriptは不要: window.innerWidth の検出 */
```

#### Container Queries

```css
/* ✅ コンポーネント自身のサイズに基づく */
.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card {
    grid-template-columns: 1fr 1fr;
  }
}

/* ❌ ResizeObserver は不要 */
```

---

### 状態管理

#### :target

```css
/* ✅ URL ハッシュベースの状態管理 */
.modal {
  display: none;
}

.modal:target {
  display: flex;
}

/* HTML: <a href="#modal">Open</a> */
/* ❌ JavaScriptは不要: showModal(), hideModal() */
```

#### :checked

```css
/* ✅ チェックボックスによる状態管理 */
.toggle:checked ~ .content {
  max-height: 500px;
  opacity: 1;
}

.toggle:not(:checked) ~ .content {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}

/* ❌ JavaScriptは不要: toggleClass() */
```

#### :has()

```css
/* ✅ 親要素のスタイリング */
.form:has(input:invalid) .submit-button {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ❌ JavaScriptは不要: input.addEventListener('invalid') */
```

---

## 🔀 一般的なパターン

### アコーディオン

```html
<details>
  <summary>クリックして展開</summary>
  <p>展開されたコンテンツ</p>
</details>
```

```css
details {
  border: 1px solid #ddd;
}

summary {
  cursor: pointer;
  padding: 1rem;
}

summary::marker {
  content: '▶ ';
}

details[open] summary::marker {
  content: '▼ ';
}

/* ❌ JavaScriptは不要: onClick, setState, CSSクラス切り替え */
```

**メリット**:

- ブラウザネイティブ
- アクセシビリティ組み込み
- キーボードナビゲーション対応

---

### ツールチップ

```css
.tooltip {
  position: relative;
}

.tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);

  /* デフォルトで非表示 */
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s, visibility 0s 0.3s;
}

.tooltip:hover::after,
.tooltip:focus::after {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.3s;
}

/* HTML: <button class="tooltip" data-tooltip="ヒント">ボタン</button> */
/* ❌ JavaScriptは不要: 位置計算、表示/非表示制御 */
```

---

### モーダル

```css
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);

  display: none;
  place-items: center;
}

.modal:target {
  display: grid;
}

/* HTML: <a href="#myModal">開く</a> */
/* HTML: <div id="myModal" class="modal">...</div> */
/* ❌ JavaScriptは不要: openModal(), closeModal() */
```

---

## ⚖️ JavaScriptが必要な場合

### CSSで十分な場合

- ✅ 静的なアニメーション
- ✅ hover、focus、checkbox の状態変化
- ✅ シンプルな表示/非表示の切り替え
- ✅ レスポンシブレイアウト
- ✅ URLベースの状態管理

### JavaScriptが必要な場合

- ❌ API データフェッチング
- ❌ フォーム送信とバリデーション
- ❌ 複雑な状態管理（複数のインタラクション）
- ❌ 動的コンテンツ生成
- ❌ ブラウザAPI使用（localStorage、WebSocketなど）

---

## 🚀 決定フレームワーク

実装前に自問してください:

### 1. 「これはCSSだけでできるか？」

```text
レイアウト → Grid/Flexbox
位置 → Transform
表示制御 → visibility/opacity
状態管理 → :target, :checked, :has()
アニメーション → transition/animation
```

### 2. 「これは本当に今必要か？」 (YAGNI)

```text
❓ 実際に問題が起きているか？
❓ ユーザーから要望があったか？
❓ 測定可能な証拠があるか？

すべて No → まだ実装しない
```

### 3. 「最もシンプルな解決策は？」 (オッカムの剃刀)

```text
オプション A: 3行のCSS
オプション B: 50行のJavaScript + 10行のCSS

→ オプション A を選択
```

---

## 💡 実践的応用

### 自動トリガー例

```markdown
ユーザー: "カードをホバー時に拡大したい"

スキルが自動トリガー →

「Progressive Enhancement の観点から、これはCSS transformで実現できます:
    ```css
    .card {
      transition: transform 0.3s;
    }

    .card:hover {
      transform: scale(1.05);
    }
    ```
JavaScriptは不要です。」

```

### 一般的な提案パターン

1. **レイアウトに関する質問**
   - 「Grid/Flexbox で解決できるか検討しましょう」

2. **アニメーションに関する質問**
   - 「CSS transition で十分ではないでしょうか？」

3. **状態管理に関する質問**
   - 「:checked や :has() で状態を管理できます」

4. **レスポンシブに関する質問**
   - 「まずは Media Queries から始めましょう」

---

## 📚 関連原則

- **オッカムの剃刀**: シンプルな解決策を優先
- **YAGNI**: 本当に必要になるまで実装しない
- **アウトカム優先**: アーキテクチャよりも成果を優先

---

## ✨ 重要なポイント

1. **CSS優先**: まずCSSソリューションを検討
2. **JavaScript最後**: 本当に必要な場合のみ
3. **ネイティブ優先**: ブラウザネイティブ機能を活用（`<details>`、`:has()`など）
4. **プログレッシブ**: シンプルに始めて、必要に応じて拡張

---

**覚えておいてください**: 「最良のコードは、存在する必要のないコード」
