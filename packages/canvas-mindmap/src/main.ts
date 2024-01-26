import { Layer } from "effect"
import * as Plugin from "effect-obsidian/Plugin"
import { NewNodeLive } from "./NewNode.js"
import * as Settings from "./Settings.js"

const MainLive = Layer.mergeAll(NewNodeLive).pipe(
  Layer.provide(Settings.layer)
)

export default class CanvasMindmap extends Plugin.Class(MainLive) {}
