# 文章レビュー

文脈を共有しリンク先を開けるチームメイトに向けて書く。ゼロ文脈の読者向けではない。Issue が運ぶのは差分、背景はリンクが運ぶ。

## 構造 (Issue 固有)

| チェック          | 質問                                                                           |
| ----------------- | ------------------------------------------------------------------------------ |
| Problem stated    | 問題や要望が冒頭の 1-3 行で述べられているか                                    |
| Reproducible      | Bug: 再現手順が具体的か。Feature: ユースケースが具体的か                       |
| Expected outcome  | 期待される振る舞いが明示されており、読者の推測に任されていないか               |
| Reader action     | 求めるアクションが具体的か ("review spec", "investigate cause", "decide by X") |
| Scope             | 1 つの問題に集中しており、関連する懸念をまとめて投げ込んでいないか             |
| Outcome alignment | Outcome state に貢献するか。Non-goals に踏み込むなら body で明示的にフラグする |

## Anti-AI-pattern

| パターン           | シグナル                                                                                                       | 修正                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Boilerplate opener | `This issue describes/reports/proposes...`                                                                     | 自己紹介でなく問題から始める                                                                      |
| Empty intensifier  | `comprehensive`, `robust`, `seamless`, `thorough`                                                              | 削除するか具体 (件数、名前) に置換                                                                |
| Filler verb        | `leverage`, `utilize`, `facilitate`                                                                            | `use`, `do`, `let` を使う                                                                         |
| Vague quantifier   | `various issues`, `multiple concerns`, `several bugs`                                                          | 列挙するか件数を示す                                                                              |
| Hedge stacking     | `might potentially`, `could possibly`, `may perhaps`                                                           | hedge は最大 1 つ、または断言する                                                                 |
| Filler phrase      | `It should be noted that...`, `Looking forward to your thoughts`, `Any feedback welcome`                       | 削除。事実を述べるか直接尋ねる                                                                    |
| Doc transcription  | リンク済み設計 doc の内容を Issue 内で再説明する                                                               | リンク + 要点 1 行。差分だけ書く                                                                  |
| Repeated rationale | 同じ設計理由を 1 Issue 内で 2 回説明する                                                                       | 決定が着地する箇所で 1 回だけ述べる                                                               |
| Redundant form     | 同じ構造や情報を図・表・list の複数形式で重複表現する (依存関係を図と順序表と Tracking list で 3 重に書くなど) | 最も読みやすい 1 形式に絞り、残りを削る                                                           |
| Bold overuse       | 太字が数行おきに散在する                                                                                       | 構造は見出しに任せ、太字は警告のみ                                                                |
| Over-specified AC  | 受け入れ条件に書き方の詳細 (story 名, addon 設定) を列挙する                                                   | criterion は残し書き方の詳細を削る。UI コンポーネント issue では Storybook/a11y を DoD として残す |
| Compulsive section | 書くことがないのに optional セクションを埋める                                                                 | 空の optional セクションは省略する                                                                |
