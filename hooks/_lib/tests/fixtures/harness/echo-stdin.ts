/// <reference types="node" />
import { readFileSync } from "node:fs";

process.stdout.write(readFileSync(0, "utf8"));
