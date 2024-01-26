import { Layer } from "effect";
import * as Plugin from "effect-obsidian/Plugin";
import { NewNodeLive } from "./NewNode.js";

const MainLive = Layer.mergeAll(NewNodeLive);
export default class CanvasMindmap extends Plugin.Class(MainLive) {}
