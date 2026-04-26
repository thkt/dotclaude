# Flaky Test Management

## Strategy

| Phase   | Action              | Pattern/Command          |
| ------- | ------------------- | ------------------------ |
| Tag     | Mark flaky          | `describe("@flaky ...")` |
| Isolate | Exclude from CI     | `--grep-invert @flaky`   |
| Debug   | Run flaky only      | `--grep @flaky`          |
| Verify  | 5 consecutive pass  | `--repeat-each=5`        |
| Promote | Remove tag, monitor | CI stability check       |

## Cause Categories

| Category | Examples                        |
| -------- | ------------------------------- |
| Timing   | Async, animation, API latency   |
| Order    | Shared state, parallel conflict |
| External | Network, time, environment      |

## Metrics

| Metric          | Healthy | Warning |
| --------------- | ------- | ------- |
| Flaky rate      | < 1%    | > 5%    |
| Days to fix     | < 7     | > 14    |
| Recurrence rate | < 10%   | > 20%   |
