/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import { identity, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Canvas from "../Canvas.js"

/**
 * @since 1.0.0
 * @category order
 */
export const yOrder: Order.Order<{ y: number }> = Order.struct({
  y: Order.number
})

/**
 * @since 1.0.0
 * @category combinators
 */
export const parent = (
  node: Canvas.CanvasNode
): Effect.Effect<Option.Option<Canvas.CanvasNode>, never, Canvas.Canvas> =>
  Effect.gen(function*(_) {
    const canvas = yield* _(Canvas.Canvas)
    return pipe(
      canvas.getEdgesForNode(node),
      ReadonlyArray.findFirst((edge) => edge.to.node.id === node.id),
      Option.map((_) => _.from.node)
    )
  })

/**
 * @since 1.0.0
 * @category combinators
 */
export const children = (
  node: Canvas.CanvasNode
): Effect.Effect<ReadonlyArray<Canvas.CanvasNode>, never, Canvas.Canvas> =>
  Effect.gen(function*(_) {
    const canvas = yield* _(Canvas.Canvas)
    return childrenFromEdges(node, canvas.getEdgesForNode(node))
  })

/**
 * @since 1.0.0
 * @category combinators
 */
export const childrenFromEdges = (
  node: Canvas.CanvasNode,
  edges: ReadonlyArray<Canvas.CanvasEdge>,
  leftToRight = false
): ReadonlyArray<Canvas.CanvasNode> =>
  pipe(
    ReadonlyArray.filter(edges, (_) => _.from.node.id === node.id),
    leftToRight
      ? ReadonlyArray.filter((_) =>
        _.from.side === "right" && _.to.side === "left"
      )
      : identity,
    ReadonlyArray.map((_) => _.to.node),
    ReadonlyArray.sort(yOrder)
  )

/**
 * @since 1.0.0
 * @category combinators
 */
export const siblings = (
  node: Canvas.CanvasNode
): Effect.Effect<Array<Canvas.CanvasNode>, never, Canvas.Canvas> =>
  Effect.gen(function*(_) {
    const canvas = yield* _(Canvas.Canvas)
    const parentNode = yield* _(parent(node))
    return parentNode.pipe(
      Option.map((parent) =>
        pipe(
          canvas.getEdgesForNode(parent),
          ReadonlyArray.filter((_) => _.from.node.id === parent.id),
          ReadonlyArray.map((_) => _.to.node),
          ReadonlyArray.sort(yOrder)
        )
      ),
      Option.getOrElse(() => [])
    )
  })
