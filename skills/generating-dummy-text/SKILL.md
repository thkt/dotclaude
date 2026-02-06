---
name: generating-dummy-text
description: >
  Generate dummy text with exact character count.
  Use when user mentions ダミーテキスト, ダミー文字, テスト文字列,
  N文字のテキスト, N文字ください, 文字数指定, lorem ipsum, dummy text.
allowed-tools: [Bash]
user-invocable: false
---

# Generating Dummy Text

## Language Detection

| Keyword                      | Language |
| ---------------------------- | -------- |
| 英語, English, lorem         | English  |
| default (日本語, 漢字, etc.) | Japanese |

## Usage

Extract the character count (N) and language from user request, then execute:

### Japanese (Default)

```bash
python3 -c "
s = '本日は晴天なり。明日の天気も良いでしょう。健康的な生活を送るためには、適度な運動と栄養バランスの取れた食事が重要です。皆様のご来場を心よりお待ちしております。詳細はウェブサイトをご確認ください。お問い合わせは電話またはメールにて承っております。'
print((s * (N // len(s) + 1))[:N])
"
```

### English

```bash
python3 -c "
s = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. '
print((s * (N // len(s) + 1))[:N])
"
```

Replace N with the actual number.

### Verify

```bash
python3 -c "print(len('GENERATED_TEXT'))"
```

## Examples

| Request                 | N    | Lang |
| ----------------------- | ---- | ---- |
| 150文字のダミーテキスト | 150  | ja   |
| ダミーテキスト1000文字  | 1000 | ja   |
| 英語で500文字           | 500  | en   |
| lorem ipsum 200 chars   | 200  | en   |

## Output

```text
[generated text]
```

✓ Characters: N / N (verified)

Regenerate if count mismatches.
