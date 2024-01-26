import * as path from "node:path"
import type { UserConfig } from "vitest/config"

// This is a workaround, see https://github.com/vitest-dev/vitest/issues/4744
const config: UserConfig = {
  test: {
    fakeTimers: {
      toFake: undefined
    },
    sequence: {
      concurrent: true
    },
    alias: {
      "effect-obsidian": path.join(__dirname, "packages/effect-obsidian/src"),
    }
  }
}

export default config
