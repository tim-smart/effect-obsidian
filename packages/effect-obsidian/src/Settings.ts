/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberMap from "effect/FiberMap"
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
  schema: Schema.Schema<R, I, A>,
  register: (get: () => A, update: (_: (_: A) => A) => Promise<void>) => Tab
): {
  readonly tag: Context.Tag<Settings, SubscriptionRef.SubscriptionRef<A>>
  readonly layer: Layer.Layer<Plugin | R, never, Settings>
  readonly runWhen: <R, E>(
    f: (_: A) => boolean,
    effect: Effect.Effect<R, E, void>
  ) => Effect.Effect<
    Settings | Scope.Scope | Exclude<R, Scope.Scope>,
    never,
    void
  >
} => {
  const tag = Context.Tag<Settings, SubscriptionRef.SubscriptionRef<A>>(
    "effect-obsidian/Settings"
  )
  const layer = Effect.gen(function*(_) {
    const plugin = yield* _(Plugin)
    const data = yield* _(
      Effect.promise(() => plugin.loadData()),
      Effect.flatMap((_) => Schema.decodeUnknown(schema)(_ || {})),
      Effect.orDie
    )
    const ref = yield* _(SubscriptionRef.make(data))

    yield* _(
      ref.changes,
      Stream.drop(1),
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

    return ref
  }).pipe(
    Layer.scoped(tag)
  )

  const runWhen = <R, E>(
    f: (_: A) => boolean,
    effect: Effect.Effect<R, E, void>
  ): Effect.Effect<
    Settings | Scope.Scope | Exclude<R, Scope.Scope>,
    never,
    void
  > =>
    Effect.gen(function*(_) {
      const ref = yield* _(tag)
      const map = yield* _(FiberMap.make<string>())
      yield* _(
        ref.changes,
        Stream.mapEffect(
          (_): Effect.Effect<Exclude<R, Scope.Scope>, never, void> =>
            f(_) ?
              effect.pipe(
                Effect.zipRight(Effect.never),
                Effect.scoped,
                FiberMap.run(map, "fiber")
              ) :
              FiberMap.clear(map)
        ),
        Stream.runDrain,
        Effect.forkScoped
      )
    })

  return { tag, layer, runWhen } as const
}
