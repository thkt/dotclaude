---
name: generating-dummy-text
description: >
  指定した文字数のダミーテキストを正確に生成する。
  ダミーテキスト、ダミー文字、テスト文字列、N文字のテキスト、
  N文字ください、文字数指定、lorem ipsum、dummy text などのキーワードで起動。
allowed-tools:
  - Bash
user-invocable: false
---

# ダミーテキスト生成

## 言語判定

| キーワード                     | 言語   |
| ------------------------------ | ------ |
| 英語, English, lorem           | 英語   |
| デフォルト（日本語、漢字など） | 日本語 |

## 使い方

ユーザーのリクエストから文字数（N）と言語を抽出し、以下を実行する。

### 日本語（デフォルト）

```bash
python3 -c "
s = '本日は晴天なり。明日の天気も良いでしょう。健康的な生活を送るためには、適度な運動と栄養バランスの取れた食事が重要です。皆様のご来場を心よりお待ちしております。詳細はウェブサイトをご確認ください。お問い合わせは電話またはメールにて承っております。'
print((s * (N // len(s) + 1))[:N])
"
```

### 英語

```bash
python3 -c "
s = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. '
print((s * (N // len(s) + 1))[:N])
"
```

Nは実際の数値に置き換える。

### 確認

```bash
python3 -c "print(len('生成されたテキスト'))"
```

## 例

| リクエスト              | N    | 言語   |
| ----------------------- | ---- | ------ |
| 150文字のダミーテキスト | 150  | 日本語 |
| ダミーテキスト1000文字  | 1000 | 日本語 |
| 英語で500文字           | 500  | 英語   |
| lorem ipsum 200 chars   | 200  | 英語   |

## 出力

```text
[生成されたテキスト]
```

✓ 文字数: N / N（検証済み）

不一致の場合は再生成。
