# Naming Conventions

## Principles

| Principle     | Bad                 | Good                                 |
| ------------- | ------------------- | ------------------------------------ |
| Unambiguous   | `x > LIMIT`         | `x >= MIN_ITEMS_TO_DISPLAY`          |
| Concrete      | `processData(data)` | `validateUserRegistration(formData)` |
| Searchable    | `7`                 | `DAYS_IN_WEEK = 7`                   |
| Pronounceable | `usrCstmrRcd`       | `userCustomerRecord`                 |

## Variable Naming

| Pattern        | Example                               |
| -------------- | ------------------------------------- |
| Specific       | `userProfile` not `data`              |
| Descriptive    | `totalPrice` not `result`             |
| Boolean prefix | `isValid`, `hasPermission`, `canEdit` |

## Function Naming

| Pattern   | Examples                                     |
| --------- | -------------------------------------------- |
| Verb-Noun | `getUserById`, `createPost`, `deleteComment` |
| Boolean   | `isValidEmail`, `hasPermission`              |
| Handler   | `handleLoginClick`, `onSubmit`               |

## Test

Can someone understand this name without seeing the implementation? If not → more specific.
