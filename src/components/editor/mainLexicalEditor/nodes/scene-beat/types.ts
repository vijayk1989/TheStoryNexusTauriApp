import type { SerializedLexicalNode, Spread } from "lexical";
import type { SceneBeat } from "@/types/story";

export type SerializedSceneBeatNode = Spread<
  {
    type: "scene-beat";
    version: 2;
    sceneBeatId: string;
    command?: string;
    povType?: SceneBeat["povType"];
    povCharacter?: string;
    generatedContent?: string;
    accepted?: boolean;
    metadata?: SceneBeat["metadata"];
    collapsed?: boolean;
  },
  SerializedLexicalNode
>;

export type SceneBeatNodeSnapshot = Pick<
  SerializedSceneBeatNode,
  | "sceneBeatId"
  | "command"
  | "povType"
  | "povCharacter"
  | "generatedContent"
  | "accepted"
  | "metadata"
  | "collapsed"
>;

