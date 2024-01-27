import { Layer } from "effect"
import * as Plugin from "effect-obsidian/Plugin"
import { NewNodeLive } from "./NewNode.js"
import { NodeNavigationLive } from "./NodeNavigation.js"

const MainLive = Layer.mergeAll(NewNodeLive, NodeNavigationLive)

export default class CanvasMindmap extends Plugin.Class(MainLive) {}
