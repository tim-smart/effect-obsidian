import { Context, Effect, Layer, Option, PubSub, ReadonlyArray } from "effect"
import * as Canvas from "effect-obsidian/Canvas"
import * as Node from "effect-obsidian/Canvas/Node"

export interface NewNodeHub {
  readonly _: unique symbol
}
export const NewNodeHub = Context.Tag<NewNodeHub, PubSub.PubSub<Canvas.CanvasNode>>(
  "canvas-mindmap/NewNodeHub"
)
export const NewNodeHubLive = Layer.scoped(NewNodeHub, PubSub.unbounded<Canvas.CanvasNode>())

export const NewNodeLive = Effect.all([
  Canvas.addCommand({
    id: "canvas-mindmap/new-node",
    name: "New Node",
    hotkeys: [{ modifiers: ["Alt"], key: "Enter" }],
    run: Effect.gen(function*(_) {
      const hub = yield* _(NewNodeHub)
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

      newNode.setColor(node.color)

      if (Option.isSome(parentNode)) {
        yield* _(
          Canvas.createEdge({
            from: parentNode.value,
            to: newNode
          })
        )
      }

      yield* _(hub.publish(newNode))

      canvas.requestSave()
      canvas.zoomToSelection()
    }).pipe(Effect.catchAllCause(Effect.log))
  }),
  Canvas.addCommand({
    id: "canvas-mindmap/new-child-node",
    name: "New Child Node",
    hotkeys: [{ modifiers: ["Alt"], key: "Tab" }],
    run: Effect.gen(function*(_) {
      const hub = yield* _(NewNodeHub)
      const canvas = yield* _(Canvas.Canvas)
      const node = yield* _(Canvas.selectedNode, Effect.flatten)
      const lastChild = yield* _(
        Node.children(node),
        Effect.map(ReadonlyArray.last)
      )

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

      yield* _(
        Canvas.createEdge({
          from: node,
          to: newNode
        })
      )

      yield* _(hub.publish(newNode))

      canvas.requestSave()
      canvas.zoomToSelection()
    }).pipe(Effect.catchAllCause(Effect.log))
  })
]).pipe(
  Layer.scopedDiscard,
  Layer.provide(NewNodeHubLive)
)
