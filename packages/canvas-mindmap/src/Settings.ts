import { Schema } from "@effect/schema"
import * as Settings from "effect-obsidian/Settings"
import { PluginSettingTab, Setting } from "obsidian"

export const {
  layer,
  runWhen,
  tag
} = Settings.layer(
  Schema.struct({
    autoLayoutOnInsert: Schema.optional(Schema.boolean, { default: () => false })
  }),
  (get, update) =>
    class SettingsTab extends PluginSettingTab {
      display() {
        this.containerEl.empty()
        const current = get()
        new Setting(this.containerEl)
          .setName("Auto Layout on Insert")
          .setDesc("Trigger auto layout when inserting a new node")
          .addToggle((toggle) =>
            toggle
              .setValue(current.autoLayoutOnInsert)
              .onChange((value) =>
                update((_) => ({
                  ..._,
                  autoLayoutOnInsert: value
                }))
              )
          )
      }
    }
)
