import { Effect, Layer, Option } from "effect"
import * as Canvas from "effect-obsidian/Canvas"
import * as Node from "effect-obsidian/Canvas/Node"

export const NewNodeLive = Layer.scopedDiscard(
  Effect.gen(function*(_) {
    yield* _(Canvas.addCommand({
      id: "canvas-mindmap/new-node",
      name: "New Node",
      hotkeys: [{ modifiers: ["Ctrl"], key: "Enter" }],
      run: Effect.gen(function*(_) {
        const canvas = yield* _(Canvas.Canvas)
        const node = yield* _(Canvas.selectedNode, Effect.flatten)
        const parentNode = yield* _(Node.parent(node))
        const siblings = yield* _(Node.siblings(node))
        const lastNode = siblings[siblings.length - 1] ?? node

        const newNode = canvas.createTextNode({
          pos: {
            x: lastNode.x,
            y: lastNode.y + lastNode.height + 20
          }
        })

        console.log(node)
        newNode.setColor(node.color)

        if (Option.isSome(parentNode)) {
          yield* _(Canvas.createEdge({
            from: parentNode.value,
            to: newNode
          }))
        }

        canvas.requestSave()
      }).pipe(Effect.catchAllCause(Effect.log))
    }))

    yield* _(Canvas.addCommand({
      id: "canvas-mindmap/new-child-node",
      name: "New Child Node",
      hotkeys: [{ modifiers: ["Ctrl"], key: "Tab" }],
      run: Effect.gen(function*(_) {
        const canvas = yield* _(Canvas.Canvas)
        const node = yield* _(Canvas.selectedNode, Effect.flatten)

        const newNode = canvas.createTextNode({
          pos: {
            x: node.x + node.width + 200,
            y: node.y
          }
        })

        yield* _(Canvas.createEdge({
          from: node,
          to: newNode
        }))

        canvas.requestSave()
      }).pipe(Effect.catchAllCause(Effect.log))
    }))
  })
)
