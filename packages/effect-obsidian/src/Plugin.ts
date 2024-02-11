/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberSet from "effect/FiberSet"
import * as Layer from "effect/Layer"
import * as Runtime from "effect/Runtime"
import * as Scope from "effect/Scope"
import * as Obsidian from "obsidian"

/**
 * @since 1.0.0
 * @category tags
 */
export interface Plugin {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Plugin: Context.Tag<Plugin, Obsidian.Plugin> = Context.GenericTag<
  Plugin,
  Obsidian.Plugin
>(
  "effect-obsidian/Plugin"
)

/**
 * @since 1.0.0
 * @category tags
 */
export interface Editor {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Editor = Context.GenericTag<Editor, Obsidian.Editor>(
  "effect-obsidian/Plugin/Editor"
)

/**
 * @since 1.0.0
 * @category tags
 */
export interface MarkdownView {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const MarkdownView = Context.GenericTag<
  MarkdownView,
  Obsidian.MarkdownView | Obsidian.MarkdownFileInfo
>(
  "effect-obsidian/Plugin/MarkdownView"
)

/**
 * @since 1.0.0
 * @category classes
 */
export const Class = <E, A>(
  layer: Layer.Layer<A, E, Plugin>
): typeof Obsidian.Plugin => (class extends EffectClass<E> {
  run(): Effect.Effect<void, E, Plugin | Scope.Scope> {
    return Layer.build(layer)
  }
})

/**
 * @since 1.0.0
 * @category classes
 */
export abstract class EffectClass<E> extends Obsidian.Plugin {
  private scope: Scope.CloseableScope | undefined

  /**
   * @since 1.0.0
   */
  abstract run(): Effect.Effect<void, E, Plugin | Scope.Scope>

  /**
   * @since 1.0.0
   */
  onload() {
    this.scope = Effect.runSync(Scope.make())
    return Effect.runPromise(
      this.run().pipe(
        Effect.provideService(Plugin, this),
        Effect.provideService(Scope.Scope, this.scope)
      )
    )
  }

  /**
   * @since 1.0.0
   */
  onunload(): void {
    if (this.scope) {
      Effect.runFork(Scope.close(this.scope, Exit.unit))
      this.scope = undefined
    }
  }
}

/**
 * @since 1.0.0
 * @category commands
 */
export interface BaseCommand extends
  Omit<
    Obsidian.Command,
    "callback" | "checkCallback" | "editorCallback" | "editorCheckCallback"
  >
{}

/**
 * @since 1.0.0
 * @category commands
 */
export interface Command<R, E> extends BaseCommand {
  readonly run: Effect.Effect<void, E, R>
  readonly check?: Effect.Effect<boolean, E, R>
}

/**
 * @since 1.0.0
 * @category commands
 */
export const addCommand = <R, E>(
  command: Command<R, E>
): Effect.Effect<void, never, R | Plugin | Scope.Scope> =>
  Effect.gen(function*(_) {
    const plugin = yield* _(Plugin)
    const runtime = yield* _(Effect.runtime<R>())
    const run = yield* _(FiberSet.makeRuntime<R>())
    const runSync = Runtime.runSync(runtime)

    plugin.addCommand(
      command.check ?
        {
          ...command,
          checkCallback(checking) {
            const canRun = runSync(command.check!)
            if (canRun && !checking) {
              run(command.run)
            }
            return canRun
          }
        } :
        {
          ...command,
          callback() {
            run(command.run)
          }
        }
    )
  })

/**
 * @since 1.0.0
 * @category commands
 */
export const addCommandEditor = <R, E>(
  command: Command<R, E>
): Effect.Effect<
  void,
  never,
  Exclude<Exclude<R, Editor>, MarkdownView> | Plugin | Scope.Scope
> =>
  Effect.gen(function*(_) {
    const plugin = yield* _(Plugin)
    const runtime = yield* _(
      Effect.runtime<Exclude<Exclude<R, Editor>, MarkdownView>>()
    )
    const run = yield* _(
      FiberSet.makeRuntime<Exclude<Exclude<R, Editor>, MarkdownView>>()
    )
    const runSync = Runtime.runSync(runtime)

    plugin.addCommand(
      command.check ?
        {
          ...command,
          editorCheckCallback(checking, editor, view) {
            const canRun = runSync(command.check!.pipe(
              Effect.provideService(Editor, editor),
              Effect.provideService(MarkdownView, view)
            ))
            if (canRun && !checking) {
              run(command.run.pipe(
                Effect.provideService(Editor, editor),
                Effect.provideService(MarkdownView, view)
              ))
            }
            return canRun
          }
        } :
        {
          ...command,
          editorCallback(editor, view) {
            run(command.run.pipe(
              Effect.provideService(Editor, editor),
              Effect.provideService(MarkdownView, view)
            ))
          }
        }
    )
  })

/**
 * @since 1.0.0
 * @category accessors
 */
export const workspace: Effect.Effect<Obsidian.Workspace, never, Plugin> =
  Effect.map(
    Plugin,
    (_) => _.app.workspace
  )

/**
 * @since 1.0.0
 * @category runtime
 */
export const runner = <Args extends ReadonlyArray<any>, R, E>(
  f: (...args: Args) => Effect.Effect<void, E, R>
): Effect.Effect<(...args: Args) => void, never, Scope.Scope | R> =>
  Effect.gen(function*(_) {
    const run = yield* _(FiberSet.makeRuntime<R>())
    return (...args: Args) => {
      run(f(...args))
    }
  })
