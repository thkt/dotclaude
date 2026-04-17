#!/usr/bin/env python3
"""Generate a self-contained HTML verification report from a JSON manifest."""

import argparse
import base64
import json
import pathlib
import sys


def encode_image(path: str) -> str | None:
    p = pathlib.Path(path)
    if not p.exists():
        return None
    return base64.b64encode(p.read_bytes()).decode()


def render_step(step: dict) -> str:
    n = step["n"]
    text = step["text"]
    status = step.get("status", "ok")
    note = step.get("note", "")
    shot_path = step.get("screenshot", "")

    status_label = "OK" if status == "ok" else "FAIL"
    status_class = "ok" if status == "ok" else "fail"

    img_html = ""
    if shot_path:
        b64 = encode_image(shot_path)
        if b64:
            img_html = f'<img src="data:image/png;base64,{b64}" alt="step {n} screenshot">'
        else:
            img_html = f'<p class="missing-shot">screenshot not found: {shot_path}</p>'

    note_html = f'<p class="note">{note}</p>' if note else ""

    return f"""
<div class="step">
  <div class="step-header">
    <span class="step-num">Step {n}</span>
    <span class="step-status {status_class}">{status_label}</span>
    <span class="step-text">{text}</span>
  </div>
  {note_html}
  {img_html}
</div>"""


def generate_html(manifest: dict) -> str:
    title = manifest.get("title", "Browser Verification Report")
    url = manifest.get("url", "")
    executed_at = manifest.get("executed_at", "")
    steps = manifest.get("steps", [])

    ok_count = sum(1 for s in steps if s.get("status") == "ok")
    fail_count = len(steps) - ok_count

    steps_html = "\n".join(render_step(s) for s in steps)

    return f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      max-width: 960px;
      margin: 0 auto;
      padding: 24px 20px;
      color: #1a1a1a;
      background: #fff;
    }}
    h1 {{ font-size: 22px; margin-bottom: 16px; }}
    .summary {{
      background: #f6f8fa;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 32px;
      font-size: 14px;
      line-height: 1.8;
    }}
    .summary .result {{ margin-top: 6px; font-weight: 600; }}
    .step {{
      margin-bottom: 36px;
      padding-bottom: 28px;
      border-bottom: 1px solid #e1e4e8;
    }}
    .step:last-child {{ border-bottom: none; }}
    .step-header {{
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }}
    .step-num {{
      font-size: 13px;
      color: #666;
      min-width: 52px;
    }}
    .step-status {{
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
      letter-spacing: 0.04em;
    }}
    .ok {{ background: #d4edda; color: #155724; }}
    .fail {{ background: #f8d7da; color: #721c24; }}
    .step-text {{ font-size: 15px; }}
    .note {{
      font-size: 13px;
      color: #555;
      margin: 0 0 12px 62px;
      line-height: 1.6;
    }}
    img {{
      max-width: 100%;
      border: 1px solid #ddd;
      border-radius: 4px;
      display: block;
      margin-top: 10px;
    }}
    .missing-shot {{ font-size: 12px; color: #999; font-style: italic; }}
  </style>
</head>
<body>
  <h1>{title}</h1>
  <div class="summary">
    <div>URL: {url}</div>
    <div>実行日時: {executed_at}</div>
    <div class="result">成功 {ok_count} 件 / 失敗 {fail_count} 件</div>
  </div>
  {steps_html}
</body>
</html>"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate browser verification HTML report")
    parser.add_argument("manifest", help="Path to JSON manifest file")
    parser.add_argument("-o", "--output", default="report.html", help="Output HTML path (default: report.html)")
    args = parser.parse_args()

    manifest_path = pathlib.Path(args.manifest)
    if not manifest_path.exists():
        print(f"error: manifest not found: {args.manifest}", file=sys.stderr)
        sys.exit(1)

    manifest = json.loads(manifest_path.read_text())
    html = generate_html(manifest)

    output_path = pathlib.Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(html, encoding="utf-8")
    print(output_path.resolve())


if __name__ == "__main__":
    main()
