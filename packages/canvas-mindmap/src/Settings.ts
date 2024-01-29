import { Schema } from "@effect/schema"
import * as Settings from "effect-obsidian/Settings"
import { PluginSettingTab, Setting } from "obsidian"

export const {
  layer,
  runWhen,
  tag
} = Settings.layer(
  Schema.struct({
    autoLayoutOnChange: Schema.optional(Schema.boolean, {
      default: () => false
    })
  }),
  (get, update) =>
    class SettingsTab extends PluginSettingTab {
      display() {
        this.containerEl.empty()
        const current = get()
        new Setting(this.containerEl)
          .setName("Auto layout on changes")
          .setDesc("Trigger auto layout on card changes")
          .addToggle((toggle) =>
            toggle
              .setValue(current.autoLayoutOnChange)
              .onChange((value) =>
                update((_) => ({
                  ..._,
                  autoLayoutOnChange: value
                }))
              )
          )
      }
    }
)
