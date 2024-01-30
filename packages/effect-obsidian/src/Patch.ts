/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"

/**
 * @since 1.0.0
 */
export const prototype = <A, K extends keyof A>(
  name: string,
  self: A,
  method: K,
  patch: (original: A[K]) => A[K]
): Effect.Effect<Scope.Scope, never, void> =>
  Effect.suspend(() => {
    const symbol = Symbol.for(`effect-obsidian/Patch/${name}`)
    const proto = Object.getPrototypeOf(self)
    if (symbol in proto && proto[symbol] === true) {
      return Effect.unit
    }
    const original = proto[method]
    return Effect.acquireRelease(
      Effect.sync(() => {
        proto[method] = patch(original)
        proto[symbol] = true
      }),
      () =>
        Effect.sync(() => {
          proto[method] = original
          proto[symbol] = false
        })
    )
  })
