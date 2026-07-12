# E2E Phase

/code Step 8. Only when all conditions pass, generate Playwright tests from the Spec's e2e scenarios via `generator-e2e`.

## Conditions

All must pass, evaluated in order, skip on first fail.

| #   | Check                               | How                                       | On fail         |
| --- | ----------------------------------- | ----------------------------------------- | --------------- |
| 1   | Spec has `Type: e2e` scenarios      | ugrep Spec Test Scenarios table           | skip (silent)   |
| 2   | agent-browser installed             | `which agent-browser`                     | skip + advisory |
| 3   | Dev server detected in package.json | Match `dev`, `start:dev`, `start` scripts | skip + advisory |
| 4   | Dev server running (user confirms)  | AskUserQuestion: "Dev server at {url}?"   | skip + advisory |

## Dev Server Detection

Detected from `package.json` scripts. Extract port from script value if specified (`--port`, `-p`, `PORT=`).

| Priority | Script name pattern | Default URL           |
| -------- | ------------------- | --------------------- |
| 1        | dev, start:dev      | http://localhost:5173 |
| 2        | start               | http://localhost:3000 |

## Execution

```text
Agent(subagent_type: "generator-e2e",
      prompt: "spec_path: <path>\ndev_server_url: <url>",
      run_in_background: true)
```
