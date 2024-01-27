import { Layer } from "effect"
import * as Plugin from "effect-obsidian/Plugin"
import { AutoLayoutLive } from "./AutoLayout.js"
import { NewNodeLive } from "./NewNode.js"
import { NodeNavigationLive } from "./NodeNavigation.js"

const MainLive = Layer.mergeAll(AutoLayoutLive, NewNodeLive, NodeNavigationLive)

export default class CanvasMindmap extends Plugin.Class(MainLive) {}
