# 命名規約

## 原則

| 原則       | 悪い                | 良い                                 |
| ---------- | ------------------- | ------------------------------------ |
| 曖昧でない | `x > LIMIT`         | `x >= MIN_ITEMS_TO_DISPLAY`          |
| 具体的     | `processData(data)` | `validateUserRegistration(formData)` |
| 検索可能   | `7`                 | `DAYS_IN_WEEK = 7`                   |
| 発音可能   | `usrCstmrRcd`       | `userCustomerRecord`                 |

## 変数名

| パターン             | 例                                    |
| -------------------- | ------------------------------------- |
| 具体的               | `data` ではなく `userProfile`         |
| 説明的               | `result` ではなく `totalPrice`        |
| boolean プレフィクス | `isValid`, `hasPermission`, `canEdit` |

## 関数名

| パターン  | 例                                           |
| --------- | -------------------------------------------- |
| 動詞-名詞 | `getUserById`, `createPost`, `deleteComment` |
| boolean   | `isValidEmail`, `hasPermission`              |
| ハンドラ  | `handleLoginClick`, `onSubmit`               |

## テスト

実装を見ずにこの名前を理解できるか。できないならもっと具体的に。
