import { Array, Effect, Layer } from "effect"
import * as Canvas from "effect-obsidian/Canvas"
import * as Node from "effect-obsidian/Canvas/Node"

export const NodeNavigationLive = Effect.all([
  Canvas.addCommand({
    id: "focus-down",
    name: "Focus down",
    run: Effect.gen(function*() {
      const canvas = yield* Canvas.Canvas
      const node = yield* Effect.flatten(Canvas.selectedNode)
      const nextNode = yield* Node.siblings(node).pipe(
        Effect.flatMap(Array.findFirst((_) => _.y > node.y))
      )
      canvas.selectOnly(nextNode)
      canvas.panIntoView(nextNode.getBBox())
    })
  }),
  Canvas.addCommand({
    id: "focus-up",
    name: "Focus up",
    run: Effect.gen(function*() {
      const canvas = yield* Canvas.Canvas
      const node = yield* Effect.flatten(Canvas.selectedNode)
      const nextNode = yield* Node.siblings(node).pipe(
        Effect.flatMap(Array.findLast((_) => _.y < node.y))
      )
      canvas.selectOnly(nextNode)
      canvas.panIntoView(nextNode.getBBox())
    })
  }),
  Canvas.addCommand({
    id: "focus-left",
    name: "Focus left",
    run: Effect.gen(function*() {
      const canvas = yield* Canvas.Canvas
      const node = yield* Effect.flatten(Canvas.selectedNode)
      const parent = yield* Effect.flatten(Node.parent(node))
      canvas.selectOnly(parent)
      canvas.panIntoView(parent.getBBox())
    })
  }),
  Canvas.addCommand({
    id: "focus-right",
    name: "Focus right",
    run: Effect.gen(function*() {
      const canvas = yield* Canvas.Canvas
      const node = yield* Effect.flatten(Canvas.selectedNode)
      const child = yield* Node.children(node).pipe(
        Effect.flatMap(Array.head)
      )
      canvas.selectOnly(child)
      canvas.panIntoView(child.getBBox())
    })
  })
]).pipe(Layer.scopedDiscard)
