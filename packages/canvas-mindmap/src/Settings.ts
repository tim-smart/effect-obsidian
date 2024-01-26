import { Schema } from "@effect/schema"
import * as Settings from "effect-obsidian/Settings"
import { PluginSettingTab } from "obsidian"

export const {
  layer,
  tag
} = Settings.layer(Schema.struct({}), (_) =>
  class SettingsTab extends PluginSettingTab {
    display() {
    }
  })
