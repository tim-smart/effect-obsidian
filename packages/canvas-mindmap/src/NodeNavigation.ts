import { Effect, Layer, ReadonlyArray } from "effect"
import * as Canvas from "effect-obsidian/Canvas"
import * as Node from "effect-obsidian/Canvas/Node"

export const NodeNavigationLive = Effect.all([
  Canvas.addCommand({
    id: "focus-down",
    name: "Focus Down",
    hotkeys: [{ modifiers: ["Alt"], key: "ArrowDown" }],
    run: Effect.gen(function*(_) {
      const canvas = yield* _(Canvas.Canvas)
      const node = yield* _(Canvas.selectedNode, Effect.flatten)
      const nextNode = yield* _(
        Node.siblings(node),
        Effect.flatMap(ReadonlyArray.findFirst((_) => _.y > node.y))
      )
      canvas.selectOnly(nextNode)
      canvas.panIntoView(nextNode.getBBox())
    })
  }),
  Canvas.addCommand({
    id: "focus-up",
    name: "Focus Up",
    hotkeys: [{ modifiers: ["Alt"], key: "ArrowUp" }],
    run: Effect.gen(function*(_) {
      const canvas = yield* _(Canvas.Canvas)
      const node = yield* _(Canvas.selectedNode, Effect.flatten)
      const nextNode = yield* _(
        Node.siblings(node),
        Effect.flatMap(ReadonlyArray.findLast((_) => _.y < node.y))
      )
      canvas.selectOnly(nextNode)
      canvas.panIntoView(nextNode.getBBox())
    })
  }),
  Canvas.addCommand({
    id: "focus-left",
    name: "Focus Left",
    hotkeys: [{ modifiers: ["Alt"], key: "ArrowLeft" }],
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
    name: "Focus Right",
    hotkeys: [{ modifiers: ["Alt"], key: "ArrowRight" }],
    run: Effect.gen(function*(_) {
      const canvas = yield* _(Canvas.Canvas)
      const node = yield* _(Canvas.selectedNode, Effect.flatten)
      const child = yield* _(
        Node.children(node),
        Effect.flatMap(ReadonlyArray.head)
      )
      canvas.selectOnly(child)
      canvas.panIntoView(child.getBBox())
    })
  })
]).pipe(Layer.scopedDiscard)
