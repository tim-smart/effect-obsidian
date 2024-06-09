import { Array, Effect, Layer, Option } from "effect"
import * as Canvas from "effect-obsidian/Canvas"
import * as Node from "effect-obsidian/Canvas/Node"

export const NewNodeLive = Effect.all([
  Canvas.addCommand({
    id: "new-node",
    name: "New Node",
    hotkeys: [{ modifiers: ["Alt"], key: "Enter" }],
    run: Effect.gen(function*() {
      const canvas = yield* Canvas.Canvas
      const node = yield* Effect.flatten(Canvas.selectedNode)
      const parentNode = yield* Node.parent(node)
      const siblings = yield* Node.siblings(node)
      const lastNode = siblings[siblings.length - 1] ?? node

      const newNode = canvas.createTextNode({
        pos: {
          x: lastNode.x,
          y: lastNode.y + lastNode.height + 20
        }
      })

      newNode.setColor(node.color)

      if (Option.isSome(parentNode)) {
        yield* Canvas.createEdge({
          from: parentNode.value,
          to: newNode
        })
      }

      canvas.requestSave()
      canvas.panIntoView(newNode.getBBox())
    }).pipe(Effect.catchAllCause(Effect.log))
  }),
  Canvas.addCommand({
    id: "new-child-node",
    name: "New Child Node",
    hotkeys: [{ modifiers: ["Alt"], key: "Tab" }],
    run: Effect.gen(function*() {
      const canvas = yield* Canvas.Canvas
      const node = yield* Effect.flatten(Canvas.selectedNode)
      const lastChild = yield* Node.children(node).pipe(Effect.map(Array.last))

      const newNode = Option.match(lastChild, {
        onNone: () =>
          canvas.createTextNode({
            pos: {
              x: node.x + node.width + 200,
              y: node.y
            }
          }),
        onSome: (lastChild) =>
          canvas.createTextNode({
            pos: {
              x: lastChild.x,
              y: lastChild.y + lastChild.height + 20
            }
          })
      })

      yield* Canvas.createEdge({
        from: node,
        to: newNode
      })

      canvas.requestSave()
      canvas.panIntoView(newNode.getBBox())
    }).pipe(Effect.catchAllCause(Effect.log))
  })
]).pipe(
  Layer.scopedDiscard
)
