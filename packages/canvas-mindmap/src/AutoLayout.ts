import { Effect, HashMap, Layer, ReadonlyArray, Stream } from "effect"
import * as Canvas from "effect-obsidian/Canvas"
import * as Node from "effect-obsidian/Canvas/Node"
import * as Patch from "effect-obsidian/Patch"
import * as Plugin from "effect-obsidian/Plugin"
import type * as Obsidian from "obsidian"
import * as Settings from "./Settings.js"

class NodeBlock {
  constructor(
    readonly node: Canvas.CanvasNode,
    readonly children: ReadonlyArray<NodeBlock>,
    readonly targetWidth: number,
    readonly gap = 20
  ) {
    this.height = Math.max(
      node.height,
      ReadonlyArray.reduce(
        children,
        0,
        (acc, child) => acc === 0 ? child.height : acc + child.height + gap
      )
    )
  }

  readonly height: number
}

const run = Effect.gen(function*(_) {
  const canvas = yield* _(Canvas.Canvas)

  // root nodes
  const roots: Array<Canvas.CanvasNode> = []
  canvas.nodes.forEach((node) => {
    const isRoot = !canvas.getEdgesForNode(node).some((_) =>
      _.to.node.id === node.id
    )
    if (isRoot) {
      roots.push(node)
    }
  })
  roots.sort(Node.yOrder)

  function createBlock(
    node: Canvas.CanvasNode,
    targetWidth: number
  ): NodeBlock {
    const children = Node.childrenFromEdges(
      node,
      canvas.getEdgesForNode(node),
      true
    )
    const childTargetWidth = Math.max(...children.map((_) => _.width))
    const childBlocks = children.map((_) => createBlock(_, childTargetWidth))
    return new NodeBlock(node, childBlocks, targetWidth)
  }

  const rootTargetWidth = Math.max(...roots.map((_) => _.width))
  const rootBlocks = roots.map((_) => createBlock(_, rootTargetWidth))

  function layoutBlocks(
    blocks: ReadonlyArray<NodeBlock>,
    x?: number,
    y?: number,
    gap = 100
  ): void {
    if (ReadonlyArray.isEmptyReadonlyArray(blocks)) {
      return
    }
    const currentX = x ?? blocks[0].node.x
    let currentY = y ?? blocks[0].node.y

    blocks.forEach((block) => {
      block.node.moveTo({ x: currentX, y: currentY })
      layoutBlocks(
        block.children,
        currentX + block.targetWidth + 200,
        currentY,
        20
      )
      currentY += block.height + gap
    })
  }

  layoutBlocks(rootBlocks)
  canvas.requestSave()
})

export const AutoLayoutLive = Effect.all([
  Canvas.addCommand({
    id: "auto-layout",
    name: "Auto Layout",
    run
  }),
  Canvas.onActive(Effect.gen(function*(_) {
    const canvas = yield* _(Canvas.Canvas)
    const [get, set] = yield* _(Settings.autoLayout)
    const path = canvas.view.file!.path

    yield* _(
      Patch.prototype(
        "AutoLayout",
        canvas,
        "showQuickSettingsMenu",
        (original) =>
          function(this: Canvas.Canvas, menu: Obsidian.Menu) {
            original.call(this, menu)
            const enabled = get(path)
            menu.addItem((item) =>
              item.setTitle("Auto layout").setChecked(enabled).onClick(() => {
                set(path, !enabled)
              })
            )
          }
      )
    )

    yield* _(
      Settings.runWhen(
        () => get(path),
        Canvas.nodeChanges(canvas).pipe(
          Stream.filter(() => get(path)),
          Stream.runForEach(() => run)
        )
      )
    )
  })),
  Effect.gen(function*(_) {
    const plugin = yield* _(Plugin.Plugin)
    const [, , update] = yield* _(Settings.autoLayout)
    plugin.registerEvent(
      plugin.app.vault.on("rename", (file, prev) => {
        update((self) => {
          if (!HashMap.has(self, prev)) {
            return self
          }
          return HashMap.remove(self, prev).pipe(
            HashMap.set(file.path, HashMap.unsafeGet(self, prev))
          )
        })
      })
    )
    plugin.registerEvent(
      plugin.app.vault.on("delete", (file) => {
        update(HashMap.remove(file.path))
      })
    )
  })
]).pipe(
  Layer.scopedDiscard,
  Layer.provide(Settings.layer)
)
