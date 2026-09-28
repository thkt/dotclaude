# Capture settings and the media an Issue requires

The `capture` entry in `.dotagents.json` decides when the implement workflow captures and when it replaces the media in `destination`. Write the Issue's required media and where they go to match that behavior. When the setting and the Issue's requirements disagree, the independent review stops with `human-decision-required`. The canonical rules live in Codex's `~/.agents/scripts/README.md`, § 対象repoの設定 and § ホストによるブラウザー検証と撮影.

`required: false` does not mean the media stay unchanged. An Issue that changes a screen and says "do not update the media" contradicts the workflow's capture, and the review stops. When a change should keep the media, ask the human whether to change the `capture` setting.

| Setting | What the workflow does | What the Issue states |
| --- | --- | --- |
| `capture: null` | Never captures | The agreement that no media are needed |
| `required: true` | Always captures on the first round, whatever changed, and replaces the media in `destination` | The screens and operations to capture, and that the media in `destination` get replaced |
| `required: false` | Skips the capture when only plain Markdown changed, and keeps the existing media. Any other change, such as code, config, a capture definition, or media, captures and replaces the media in `destination` | For an Issue that changes a screen, the screens and operations to capture, and that the media in `destination` get replaced |
