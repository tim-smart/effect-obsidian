import { Schema } from "@effect/schema"
import { Effect, HashMap, Option } from "effect"
import * as Settings from "effect-obsidian/Settings"
import { PluginSettingTab, Setting } from "obsidian"

export const {
  layer,
  prop,
  runWhen,
  tag
} = Settings.layer(
  Schema.struct({
    autoLayoutDefault: Schema.optional(Schema.boolean, {
      default: () => false
    }),
    autoLayoutEnabledFor: Schema.optional(
      Schema.hashMap(Schema.string, Schema.boolean),
      { default: () => HashMap.empty() }
    )
  }),
  (get, update) =>
    class SettingsTab extends PluginSettingTab {
      display() {
        this.containerEl.empty()
        const current = get()
        new Setting(this.containerEl)
          .setName("Auto layout by default")
          .setDesc("Enable auto layout for Canvas by default")
          .addToggle((toggle) =>
            toggle
              .setValue(current.autoLayoutDefault)
              .onChange((value) =>
                update((_) => ({
                  ..._,
                  autoLayoutDefault: value
                }))
              )
          )
      }
    }
)

export const autoLayout = Effect.gen(function*(_) {
  const settings = yield* _(tag)
  const [, update] = yield* _(prop("autoLayoutEnabledFor"))

  return [
    (path: string) => {
      const current = settings.unsafeGet()
      return Option.getOrElse(
        HashMap.get(current.autoLayoutEnabledFor, path),
        () => current.autoLayoutDefault
      )
    },
    (path: string, value: boolean) => {
      return update(HashMap.set(path, value))
    },
    update
  ] as const
})
