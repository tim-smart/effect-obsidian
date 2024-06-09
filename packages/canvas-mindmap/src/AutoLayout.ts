import { Array, Effect, Layer, Option, Record, Scope, Stream } from "effect"
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
      Array.reduce(
        children,
        0,
        (acc, child) => acc === 0 ? child.height : acc + child.height + gap
      )
    )
  }

  readonly height: number
}

const run = Effect.gen(function*() {
  const canvas = yield* Canvas.Canvas

  // root nodes
  const roots: Array<Canvas.CanvasNode> = []
  canvas.nodes.forEach((node) => {
    const isRoot = node.getData().type !== "group" &&
      !canvas.getEdgesForNode(node).some((_) => _.to.node.id === node.id)
    if (isRoot) {
      roots.push(node)
    }
  })
  roots.sort(Node.yOrder)

  function createBlock(
    node: Canvas.CanvasNode,
    targetWidth: number
  ): NodeBlock {
    const children = Array.filter(
      Node.childrenFromEdges(
        node,
        canvas.getEdgesForNode(node),
        true
      ),
      (_) => _.getData().type !== "group"
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
    if (Array.isEmptyReadonlyArray(blocks)) {
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

const PatchMenu = Effect.gen(function*() {
  const scope = yield* Effect.scope
  const [get, set] = yield* Settings.autoLayout
  yield* Canvas.onActive(Canvas.Canvas.pipe(
    Effect.flatMap((canvas) =>
      Patch.prototype(
        "AutoLayout",
        canvas,
        "showQuickSettingsMenu",
        (original) => (function(this: Canvas.Canvas, menu: Obsidian.Menu) {
          original.call(this, menu)
          const path = this.view.file!.path
          const enabled = get(path)
          menu.addItem((item) =>
            item.setTitle("Auto layout").setChecked(enabled).onClick(() => {
              set(path, !enabled)
            })
          )
        })
      )
    ),
    Scope.extend(scope)
  ))
}).pipe(Layer.scopedDiscard)

const AutoLayoutOnChange = Canvas.onActive(Effect.gen(function*() {
  const canvas = yield* Canvas.Canvas
  const [get] = yield* Settings.autoLayout
  const path = canvas.view.file!.path
  yield* Settings.runWhen(
    () => get(path),
    Canvas.nodeChanges(canvas).pipe(
      Stream.filter(() => get(path)),
      Stream.runForEach(() => run)
    )
  )
})).pipe(Layer.scopedDiscard)

const Command = Canvas.addCommand({
  id: "auto-layout",
  name: "Auto Layout",
  run
}).pipe(Layer.scopedDiscard)

const UpdateSettings = Effect.gen(function*() {
  const plugin = yield* Plugin.Plugin
  const [, , update] = yield* Settings.autoLayout
  plugin.registerEvent(
    plugin.app.vault.on("rename", (file, prev) => {
      update((self) =>
        Option.match(Record.pop(self, prev), {
          onSome: ([value]) => Record.set(self, file.path, value),
          onNone: () => self
        })
      )
    })
  )
  plugin.registerEvent(
    plugin.app.vault.on("delete", (file) => {
      update(Record.remove(file.path))
    })
  )
}).pipe(Layer.effectDiscard)

export const AutoLayoutLive = Layer.mergeAll(
  Command,
  PatchMenu,
  AutoLayoutOnChange,
  UpdateSettings
).pipe(
  Layer.provide(Settings.layer)
)
