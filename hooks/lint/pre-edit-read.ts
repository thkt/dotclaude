#!/usr/bin/env bun
/**
 * PreToolUse hook: Auto-read file before Edit tool execution.
 *
 * Automatically reads file content before Edit tool runs,
 * eliminating the "file not read" error and saving a round-trip.
 *
 * Reference: https://zenn.dev/st_tech/articles/897e52be12232f
 */

import * as fs from "fs";

const MAX_FILE_SIZE = 50 * 1024; // 50KB limit

interface ToolInput {
  tool_input: {
    file_path?: string;
  };
}

async function main(): Promise<void> {
  try {
    const input = await Bun.stdin.text();
    const data: ToolInput = JSON.parse(input);

    const filePath = data.tool_input?.file_path;
    if (!filePath) {
      process.exit(0);
    }

    // Expand ~ to home directory
    const expandedPath = filePath.replace(/^~/, process.env.HOME || "");

    if (!fs.existsSync(expandedPath)) {
      process.exit(0);
    }

    const stats = fs.statSync(expandedPath);
    if (stats.size > MAX_FILE_SIZE) {
      process.exit(0);
    }

    const content = fs.readFileSync(expandedPath, "utf-8");
    console.log(content);
  } catch {
    // Always exit 0 to allow Edit to proceed
  }

  process.exit(0);
}

main();
