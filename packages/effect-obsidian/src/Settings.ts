/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberHandle from "effect/FiberHandle"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import type * as Obsidian from "obsidian"
import { Plugin } from "./Plugin.js"

/**
 * @since 1.0.0
 * @category tags
 */
export interface Settings {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export interface SettingsService<A> {
  readonly ref: SubscriptionRef.SubscriptionRef<A>
  readonly unsafeGet: () => A
  readonly unsafeUpdate: (f: (_: A) => A) => void
}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = <
  R,
  I,
  A,
  Tab extends new(
    app: Obsidian.App,
    plugin: Obsidian.Plugin
  ) => Obsidian.PluginSettingTab
>(
  schema: Schema.Schema<A, I, R>,
  register: (get: () => A, update: (_: (_: A) => A) => Promise<void>) => Tab
): {
  readonly tag: Context.Tag<Settings, SettingsService<A>>
  readonly layer: Layer.Layer<Settings, never, Plugin | Exclude<R, Scope.Scope>>
  readonly runWhen: <R, E>(
    f: (_: A) => boolean,
    effect: Effect.Effect<void, E, R>
  ) => Effect.Effect<
    void,
    never,
    Settings | Scope.Scope | Exclude<R, Scope.Scope>
  >
  readonly prop: <K extends keyof A>(
    key: K
  ) => Effect.Effect<
    readonly [() => A[K], (f: (_: A[K]) => A[K]) => void],
    never,
    Settings
  >
} => {
  const tag = Context.GenericTag<Settings, SettingsService<A>>(
    "effect-obsidian/Settings"
  )
  const layer = Effect.gen(function*() {
    const plugin = yield* Plugin
    const data = yield* Effect.promise(() => plugin.loadData()).pipe(
      Effect.flatMap((_) => Schema.decodeUnknown(schema)(_ || {})),
      Effect.orDie
    )
    const ref = yield* SubscriptionRef.make(data)

    yield* ref.changes.pipe(
      Stream.drop(1),
      Stream.debounce(1000),
      Stream.flatMap(Schema.encode(schema)),
      Stream.runForEach((data) => Effect.promise(() => plugin.saveData(data))),
      Effect.forkScoped
    )

    const update = (_: (_: A) => A) =>
      Effect.runPromise(SubscriptionRef.update(ref, _))
    const Class = register(
      () => Effect.runSync(SubscriptionRef.get(ref)),
      update
    )
    plugin.addSettingTab(new Class(plugin.app, plugin))

    return tag.of({
      ref,
      unsafeGet: () => Effect.runSync(SubscriptionRef.get(ref)),
      unsafeUpdate: (f) => Effect.runSync(SubscriptionRef.update(ref, f))
    })
  }).pipe(
    Layer.scoped(tag)
  )

  const runWhen = <R, E>(
    f: (_: A) => boolean,
    effect: Effect.Effect<void, E, R>
  ): Effect.Effect<
    void,
    never,
    Settings | Scope.Scope | Exclude<R, Scope.Scope>
  > =>
    Effect.gen(function*() {
      const settings = yield* tag
      const handle = yield* FiberHandle.make()
      yield* settings.ref.changes.pipe(
        Stream.mapEffect(
          (_): Effect.Effect<void, never, Exclude<R, Scope.Scope>> =>
            f(_) ?
              effect.pipe(
                Effect.zipRight(Effect.never),
                Effect.scoped,
                FiberHandle.run(handle, { onlyIfMissing: true })
              ) :
              FiberHandle.clear(handle)
        ),
        Stream.runDrain,
        Effect.forkScoped
      )
    })

  const prop = <K extends keyof A>(
    key: K
  ) =>
    Effect.gen(function*() {
      const settings = yield* tag
      const get = () => settings.unsafeGet()[key]
      const update = (f: (_: A[K]) => A[K]) =>
        settings.unsafeUpdate((_) => ({
          ..._,
          [key]: f(_[key])
        }))
      return [get, update] as const
    })

  return { tag, layer, runWhen, prop } as const
}
