/**
 * @since 1.0.0
 */
import * as Array from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberHandle from "effect/FiberHandle"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Obsidian from "obsidian"
import type {
  AllCanvasNodeData,
  CanvasData,
  NodeSide
} from "obsidian/canvas.js"
import * as Identifier from "./Identifier.js"
import * as Plugin from "./Plugin.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface Canvas {
  readonly _: unique symbol

  readonly getData: () => CanvasData
  readonly createTextNode: (args: {
    pos: Obsidian.Point
    text?: string
    size?: Size
    focus?: boolean
  }) => CanvasTextNode

  readonly: boolean
  view: Obsidian.MarkdownView
  x: number
  y: number
  nodes: Map<string, CanvasNode>
  edges: Map<string, CanvasEdge>
  nodeInteractionLayer: CanvasInteractionLayer
  selection: Set<CanvasNode>
  menu: CanvasMenu
  wrapperEl: HTMLElement
  history: any
  requestPushHistory: any
  nodeIndex: any

  deselectAll(): void
  getContainingNodes(coords: BBox): Array<CanvasNode>
  getEdgesForNode(node: CanvasNode): Array<CanvasEdge>
  getViewportNodes(): Array<CanvasNode>
  importData(data: CanvasData): void
  panTo(x: number, y: number): void
  panIntoView(bbox: BBox): void
  requestFrame(): void
  requestSave(save?: boolean, triggerBySelf?: boolean): void
  select(nodes: CanvasNode): void
  selectOnly(nodes: CanvasNode): void
  showQuickSettingsMenu(menu: Obsidian.Menu): void
  zoomToSelection(): void
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Canvas = Context.GenericTag<Canvas>("effect-obsidian/Canvas")

/**
 * @since 1.0.0
 * @category accessors
 */
export const get: Effect.Effect<Option.Option<Canvas>, never, Plugin.Plugin> =
  Effect.map(
    Plugin.Plugin,
    (_) =>
      Option.fromNullable(
        _.app.workspace.getActiveViewOfType(Obsidian.ItemView) as any
      ).pipe(
        Option.filter((_) => _.getViewType() === "canvas"),
        Option.map((_) => _.canvas as Canvas)
      )
  )

/**
 * @since 1.0.0
 * @category accessors
 */
export const prop = <K extends keyof Canvas>(
  key: K
): Effect.Effect<Canvas[K], never, Canvas> => Effect.map(Canvas, (_) => _[key])

/**
 * @since 1.0.0
 * @category commands
 */
export const addCommand = <R, E>(command: Plugin.Command<R, E>) =>
  Plugin.addCommand<Exclude<R, Canvas> | Plugin.Plugin, E>({
    ...command,
    check: Effect.flatMap(Plugin.Plugin, (plugin) => {
      const view = plugin.app.workspace.getActiveViewOfType(Obsidian.ItemView)
      const isCanvas = view?.getViewType() === "canvas"
      return isCanvas && command.check
        ? Effect.provideService(command.check, Canvas, (view as any).canvas)
        : Effect.succeed(isCanvas)
    }),
    run: Effect.flatMap(Plugin.Plugin, (plugin) =>
      command.run.pipe(
        Effect.provideService(
          Canvas,
          (plugin.app.workspace.getActiveViewOfType(Obsidian.ItemView) as any)
            .canvas
        )
      ))
  })

/**
 * @since 1.0.0
 * @category ops
 */
export const createEdge = (options: {
  readonly from: CanvasNode
  readonly fromSide?: NodeSide
  readonly to: CanvasNode
  readonly toSide?: NodeSide
}): Effect.Effect<void, never, Canvas> =>
  Effect.andThen(Canvas, (canvas) => {
    const data = canvas.getData()
    canvas.importData({
      edges: [
        ...data.edges,
        {
          id: Identifier.make(),
          fromNode: options.from.id,
          fromSide: options.fromSide ?? "right",
          toNode: options.to.id,
          toSide: options.toSide ?? "left"
        }
      ],
      nodes: data.nodes
    })
  })

/**
 * @since 1.0.0
 * @category ops
 */
export const selectedNode: Effect.Effect<
  Option.Option<CanvasNode>,
  never,
  Canvas
> = Effect.gen(function*() {
  const canvas = yield* Canvas
  return pipe(Array.fromIterable(canvas.selection), Array.head)
})

/**
 * @since 1.0.0
 * @category ops
 */
export const onActive = <R, E>(
  effect: Effect.Effect<void, E, R>
): Effect.Effect<
  void,
  never,
  Plugin.Plugin | Scope.Scope | Exclude<Exclude<R, Scope.Scope>, Canvas>
> =>
  Effect.gen(function*() {
    const handle = yield* FiberHandle.make()
    const scoped = effect.pipe(
      Effect.zipRight(Effect.never),
      Effect.scoped
    )
    yield* get.pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => FiberHandle.clear(handle),
          onSome: (canvas) =>
            scoped.pipe(
              Effect.provideService(Canvas, canvas),
              FiberHandle.run(handle, { onlyIfMissing: true })
            )
        })
      ),
      Effect.schedule(Schedule.spaced(2000)),
      Effect.forkScoped
    )
  })

/**
 * @since 1.0.0
 * @category ops
 */
export const nodeChanges = (
  canvas: Canvas
): Stream.Stream<number> =>
  Effect.sync(() => canvas.getData().nodes.length).pipe(
    Stream.repeatEffect,
    Stream.schedule(Schedule.spaced(50)),
    Stream.changes,
    Stream.drop(1)
  )

/**
 * @since 1.0.0
 * @category ops
 */
export const onNodeChanges = <R, E>(
  effect: Effect.Effect<void, E, R>
): Effect.Effect<
  void,
  never,
  Plugin.Plugin | Scope.Scope | Exclude<R, Canvas>
> =>
  onActive(Effect.gen(function*() {
    const canvas = yield* Canvas
    yield* nodeChanges(canvas).pipe(
      Stream.mapEffect((_) => Effect.ignoreLogged(effect)),
      Stream.runDrain,
      Effect.forkScoped
    )
  }))

/**
 * @since 1.0.0
 * @category models
 */
export interface CanvasMenu {
  containerEl: HTMLElement
  menuEl: HTMLElement
  canvas: Canvas
  selection: CanvasSelection

  render(): void

  updateZIndex(): void
}

/**
 * @since 1.0.0
 * @category models
 */
export interface CanvasSelection {
  selectionEl: HTMLElement
  resizerEls: HTMLElement
  canvas: Canvas
  bbox: BBox | undefined

  render(): void

  hide(): void

  onResizePointerDown(e: PointerEvent, direction: CanvasDirection): void

  update(bbox: BBox): void
}

/**
 * @since 1.0.0
 * @category models
 */
export interface CanvasInteractionLayer {
  interactionEl: HTMLElement
  canvas: Canvas
  target: CanvasNode | null

  render(): void

  setTarget(target: CanvasNode | null): void
}

/**
 * @since 1.0.0
 * @category models
 */
export interface CanvasNode {
  id: string

  x: number
  y: number
  width: number
  height: number
  zIndex: number
  bbox: BBox
  unknownData: CanvasNodeUnknownData
  renderedZIndex: number
  color: string

  headerComponent: Obsidian.Component

  nodeEl: HTMLElement
  labelEl: HTMLElement
  contentEl: HTMLElement
  containerEl: HTMLElement

  canvas: Canvas
  app: Obsidian.App

  getBBox(containing?: boolean): BBox
  getData: () => AllCanvasNodeData
  moveTo({ x, y }: { x: number; y: number }): void
  setColor: (color: string) => void
  render(): void

  readonly [key: string]: any
}

/**
 * @since 1.0.0
 * @category models
 */
export interface CanvasTextNode extends CanvasNode {
  text: string
  child: any
}

/**
 * @since 1.0.0
 * @category models
 */
export interface CanvasFileNode extends CanvasNode {
  file: Obsidian.TFile
}

/**
 * @since 1.0.0
 * @category models
 */
export interface CanvasLinkNode extends CanvasNode {
  url: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface CanvasGroupNode extends CanvasNode {
  label: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface CanvasEdge {
  id: string

  label: string | undefined
  lineStartGroupEl: SVGGElement
  lineEndGroupEl: SVGGElement
  lineGroupEl: SVGGElement

  path: {
    display: SVGPathElement
    interaction: SVGPathElement
  }

  from: {
    side: "left" | "right" | "top" | "bottom"
    node: CanvasNode
  }

  to: {
    side: "left" | "right" | "top" | "bottom"
    node: CanvasNode
  }

  canvas: Canvas
  bbox: BBox

  unknownData: CanvasNodeUnknownData
}

/**
 * @since 1.0.0
 * @category models
 */
export interface CanvasNodeUnknownData {
  id: string
  collapsed: boolean
  [key: string]: any
}

/**
 * @since 1.0.0
 * @category models
 */
export interface BBox {
  maxX: number
  maxY: number
  minX: number
  minY: number
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Size {
  readonly height: number
  readonly width: number
}
