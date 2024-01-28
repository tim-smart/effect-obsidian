import { Effect, Layer, ReadonlyArray } from "effect"
import * as Canvas from "effect-obsidian/Canvas"
import * as Node from "effect-obsidian/Canvas/Node"

export const NodeNavigationLive = Effect.all([
  Canvas.addCommand({
    id: "canvas-mindmap/focus-down",
    name: "Focus Down",
    hotkeys: [{ modifiers: ["Alt"], key: "ArrowDown" }],
    run: Effect.gen(function*(_) {
      const canvas = yield* _(Canvas.Canvas)
      const node = yield* _(Canvas.selectedNode, Effect.flatten)
      const siblings = yield* _(Node.siblings(node))
      const [, below] = ReadonlyArray.partition(siblings, (_) => _.y > node.y)
      if (below.length > 0) {
        canvas.selectOnly(below[0])
        canvas.zoomToSelection()
      }
    })
  }),
  Canvas.addCommand({
    id: "canvas-mindmap/focus-up",
    name: "Focus Up",
    hotkeys: [{ modifiers: ["Alt"], key: "ArrowUp" }],
    run: Effect.gen(function*(_) {
      const canvas = yield* _(Canvas.Canvas)
      const node = yield* _(Canvas.selectedNode, Effect.flatten)
      const siblings = yield* _(Node.siblings(node))
      const [, above] = ReadonlyArray.partition(siblings, (_) => _.y < node.y)
      if (above.length > 0) {
        canvas.selectOnly(above[above.length - 1])
        canvas.zoomToSelection()
      }
    })
  }),
  Canvas.addCommand({
    id: "canvas-mindmap/focus-left",
    name: "Focus Left",
    hotkeys: [{ modifiers: ["Alt"], key: "ArrowLeft" }],
    run: Effect.gen(function*(_) {
      const canvas = yield* _(Canvas.Canvas)
      const node = yield* _(Canvas.selectedNode, Effect.flatten)
      const parent = yield* _(Node.parent(node), Effect.flatten)
      canvas.selectOnly(parent)
      canvas.zoomToSelection()
    })
  }),
  Canvas.addCommand({
    id: "canvas-mindmap/focus-right",
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
      canvas.zoomToSelection()
    })
  })
]).pipe(Layer.scopedDiscard)
