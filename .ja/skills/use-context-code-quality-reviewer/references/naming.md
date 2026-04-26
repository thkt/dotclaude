# 命名規則

## 原則

| 原則       | Bad                 | Good                                 |
| ---------- | ------------------- | ------------------------------------ |
| 曖昧さなし | `x > LIMIT`         | `x >= MIN_ITEMS_TO_DISPLAY`          |
| 具体的     | `processData(data)` | `validateUserRegistration(formData)` |
| 検索可能   | `7`                 | `DAYS_IN_WEEK = 7`                   |
| 発音可能   | `usrCstmrRcd`       | `userCustomerRecord`                 |

## 変数命名

| パターン      | 例                                    |
| ------------- | ------------------------------------- |
| 具体的        | `userProfile` not `data`              |
| 説明的        | `totalPrice` not `result`             |
| Boolean接頭辞 | `isValid`, `hasPermission`, `canEdit` |

## 関数命名

| パターン  | 例                                           |
| --------- | -------------------------------------------- |
| 動詞-名詞 | `getUserById`, `createPost`, `deleteComment` |
| Boolean   | `isValidEmail`, `hasPermission`              |
| Handler   | `handleLoginClick`, `onSubmit`               |

## テスト

実装を見ずに理解できるか？ できない → より具体的に。
