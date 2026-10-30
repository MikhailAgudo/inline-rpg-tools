import { syntaxTree } from "@codemirror/language";
import { SyntaxNode } from "@lezer/common";
import {
  RangeSetBuilder,
  EditorSelection,
  SelectionRange,
} from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  ViewUpdate,
  PluginValue,
  PluginSpec,
  EditorView,
  ViewPlugin,
} from "@codemirror/view";
import { editorLivePreviewField } from "obsidian";
import { CountWidget, COUNT_REGEX } from "./count";
import { CountLimitWidget, COUNT_LIMIT_REGEX } from "./countlimit";
import { TrackWidget, TRACK_REGEX } from "./track";
import { ClockWidget, CLOCK_REGEX } from "./clock";
import { DiceWidget, DICE_REGEX } from "./dice";
import { SpaceWidget, SPACE_REGEX } from "./space";
import { getInlineCodeSpan, isInlineCodeNode } from "./shared";
import Plugin from "../../main";

type BuildMeta = string;

let pluginRef: Plugin;

// Live preview mode inline elements
class TrackPlugin implements PluginValue {
  decorations: DecorationSet = Decoration.none;
  previousBuildMeta: BuildMeta[] = [];
  spaceStore: Record<BuildMeta, number> = {};
  spaceStoreIndex: Record<number, number> = {};

  constructor(view: EditorView) {
    this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    const isLivePreview = update.state.field(editorLivePreviewField);
    const shouldDisable =
      !pluginRef?.settings?.inlineCounters || !isLivePreview;
    const shouldUpdate =
      update.docChanged ||
      update.viewportChanged ||
      (update.selectionSet && this.selectionAffectsWidgets(update));

    if (shouldDisable) {
      this.decorations = Decoration.none;
      this.previousBuildMeta = [];
    } else if (shouldUpdate) {
      this.buildDecorations(update.view);
    }
  }

  destroy() {}

  buildDecorations(view: EditorView) {
    type Candidate = {
      from: number;
      to: number;
      node: SyntaxNode;
      text: string;
      meta: BuildMeta;
      kind: "dice" | "count" | "countlimit" | "track" | "clock" | "space";
    };
    const candidates: Candidate[] = [];
    const selection = view.state.selection;
    const seenSpans = new Set<string>();

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (node) => {
          if (!isInlineCodeNode(node.type.name)) return;

          const span = getInlineCodeSpan(view.state.doc, node.from, node.to);
          const from = span.from;
          const to = span.to;
          const spanKey = `${from}:${to}`;
          if (seenSpans.has(spanKey)) return;
          seenSpans.add(spanKey);

          if (this.isRangeSelected(from, to, selection)) {
            return;
          }

          const text = span.text.trim();
          const meta = `${from}:${to}:${text}`;

          let kind: Candidate["kind"] | undefined;
          if (DICE_REGEX.test(text)) kind = "dice";
          else if (COUNT_REGEX.test(text)) kind = "count";
          else if (COUNT_LIMIT_REGEX.test(text)) kind = "countlimit";
          else if (TRACK_REGEX.test(text)) kind = "track";
          else if (CLOCK_REGEX.test(text)) kind = "clock";
          else if (SPACE_REGEX.test(text)) kind = "space";

          if (kind) {
            candidates.push({
              from: node.from,
              to: node.to,
              node: node.node,
              text,
              meta,
              kind,
            });
          }
        },
      });
    }

    const buildMeta = candidates.map(({ meta, kind }) =>
      kind === "track"
        ? `${meta}:highlight=${pluginRef?.settings?.inlineProgressHighlight ?? true}`
        : meta,
    );
    if (!this.isMetaChanged(buildMeta)) return;
    this.previousBuildMeta = buildMeta;

    const builder = new RangeSetBuilder<Decoration>();
    let widgetIndex = 0;
    for (const candidate of candidates) {
      const { node, text, kind, meta, from, to } = candidate;
      let widget;
      switch (kind) {
        case "dice":
          widget = new DiceWidget({ originalNode: node, originalText: text });
          break;
        case "count":
          widget = new CountWidget({ originalNode: node, originalText: text });
          break;
        case "countlimit":
          widget = new CountLimitWidget({ originalNode: node, originalText: text });
          break;
        case "track":
          widget = new TrackWidget({
            originalNode: node,
            originalText: text,
            highlight: pluginRef?.settings?.inlineProgressHighlight ?? true,
          });
          break;
        case "clock":
          widget = new ClockWidget({ originalNode: node, originalText: text });
          break;
        case "space": {
          const thisWidgetIndex = widgetIndex++;
          widget = new SpaceWidget({
            originalNode: node,
            originalText: text,
            initialWidth:
              this.spaceStore[meta] || this.spaceStoreIndex[thisWidgetIndex] || 0,
            updateInitialWidth: (width: number) => {
              this.spaceStore[meta] = width;
              this.spaceStoreIndex[thisWidgetIndex] = width;
            },
          });
          break;
        }
      }
      builder.add(from, to, Decoration.replace({ widget }));
    }

    this.decorations = builder.finish();
  }

  selectionAffectsWidgets(update: ViewUpdate): boolean {
    const selections = [update.startState.selection, update.state.selection];
    for (const meta of this.previousBuildMeta) {
      const [fromText, toText] = meta.split(":", 3);
      const from = Number(fromText);
      const to = Number(toText);
      if (
        selections.some((selection) =>
          this.isRangeSelected(from, to, selection),
        )
      ) {
        return true;
      }
    }

    for (const state of [update.startState, update.state]) {
      let affected = false;
      const selection = state.selection;
      for (const { from, to } of update.view.visibleRanges) {
        syntaxTree(state).iterate({
          from,
          to,
          enter: (node) => {
            if (affected || !isInlineCodeNode(node.type.name)) return;
            const span = getInlineCodeSpan(state.doc, node.from, node.to);
            const text = span.text.trim();
            const isWidget =
              DICE_REGEX.test(text) ||
              COUNT_REGEX.test(text) ||
              COUNT_LIMIT_REGEX.test(text) ||
              TRACK_REGEX.test(text) ||
              CLOCK_REGEX.test(text) ||
              SPACE_REGEX.test(text);
            if (isWidget && this.isRangeSelected(span.from, span.to, selection)) {
              affected = true;
            }
          },
        });
        if (affected) return true;
      }
    }
    return false;
  }

  isRangeSelected(
    from: number,
    to: number,
    selection: EditorSelection,
  ): boolean {
    return !!selection.ranges.find(
      (range: SelectionRange) => range.from <= to && range.to >= from,
    );
  }

  isMetaChanged(buildMeta: BuildMeta[]): boolean {
    if (buildMeta.length !== this.previousBuildMeta.length) return true;
    for (const index in buildMeta) {
      if (buildMeta[index] !== this.previousBuildMeta[index]) return true;
    }
    return false;
  }
}

const pluginSpec: PluginSpec<TrackPlugin> = {
  decorations: (value: TrackPlugin) => value.decorations,
};

export const soloToolkitExtension = (plugin: Plugin) => {
  pluginRef = plugin;
  return ViewPlugin.fromClass(TrackPlugin, pluginSpec);
};
