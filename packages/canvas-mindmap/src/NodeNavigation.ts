import { Array, Effect, Layer } from "effect"
import * as Canvas from "effect-obsidian/Canvas"
import * as Node from "effect-obsidian/Canvas/Node"

export const NodeNavigationLive = Effect.all([
  Canvas.addCommand({
    id: "focus-down",
    name: "Focus down",
    run: Effect.gen(function*(_) {
      const canvas = yield* _(Canvas.Canvas)
      const node = yield* _(Canvas.selectedNode, Effect.flatten)
      const nextNode = yield* _(
        Node.siblings(node),
        Effect.flatMap(Array.findFirst((_) => _.y > node.y))
      )
      canvas.selectOnly(nextNode)
      canvas.panIntoView(nextNode.getBBox())
    })
  }),
  Canvas.addCommand({
    id: "focus-up",
    name: "Focus up",
    run: Effect.gen(function*(_) {
      const canvas = yield* _(Canvas.Canvas)
      const node = yield* _(Canvas.selectedNode, Effect.flatten)
      const nextNode = yield* _(
        Node.siblings(node),
        Effect.flatMap(Array.findLast((_) => _.y < node.y))
      )
      canvas.selectOnly(nextNode)
      canvas.panIntoView(nextNode.getBBox())
    })
  }),
  Canvas.addCommand({
    id: "focus-left",
    name: "Focus left",
    run: Effect.gen(function*(_) {
      const canvas = yield* _(Canvas.Canvas)
      const node = yield* _(Canvas.selectedNode, Effect.flatten)
      const parent = yield* _(Node.parent(node), Effect.flatten)
      canvas.selectOnly(parent)
      canvas.panIntoView(parent.getBBox())
    })
  }),
  Canvas.addCommand({
    id: "focus-right",
    name: "Focus right",
    run: Effect.gen(function*(_) {
      const canvas = yield* _(Canvas.Canvas)
      const node = yield* _(Canvas.selectedNode, Effect.flatten)
      const child = yield* _(
        Node.children(node),
        Effect.flatMap(Array.head)
      )
      canvas.selectOnly(child)
      canvas.panIntoView(child.getBBox())
    })
  })
]).pipe(Layer.scopedDiscard)
