import { syntaxTree } from "@codemirror/language";
import { SyntaxNode } from "@lezer/common";
import {
  EditorSelection,
  RangeSetBuilder,
  SelectionRange,
} from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginSpec,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
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

type WidgetKind =
  | "dice"
  | "count"
  | "countlimit"
  | "track"
  | "clock"
  | "space";

type Candidate = {
  from: number;
  to: number;
  spanFrom: number;
  spanTo: number;
  node: SyntaxNode;
  text: string;
  meta: string;
  kind: WidgetKind;
  decoration?: Decoration;
  decorated: boolean;
};

type PositionRange = { from: number; to: number };

let pluginRef: Plugin;

// Live preview mode inline elements
class TrackPlugin implements PluginValue {
  decorations: DecorationSet = Decoration.none;
  candidates: Candidate[] = [];
  lastSelection?: EditorSelection;
  lastHighlight?: boolean;
  cacheValid = false;
  spaceStore: Record<string, number> = {};
  spaceStoreIndex: Record<number, number> = {};

  constructor(view: EditorView) {
    this.rebuildDecorations(
      view,
      pluginRef?.settings?.inlineProgressHighlight ?? true,
    );
  }

  update(update: ViewUpdate) {
    const isLivePreview = update.state.field(editorLivePreviewField);
    const isEnabled = !!pluginRef?.settings?.inlineCounters && isLivePreview;

    if (!isEnabled) {
      this.decorations = Decoration.none;
      this.candidates = [];
      this.lastSelection = undefined;
      this.cacheValid = false;
      return;
    }

    const highlight = pluginRef?.settings?.inlineProgressHighlight ?? true;
    const candidatesAreStale =
      !this.cacheValid ||
      update.docChanged ||
      update.viewportChanged ||
      highlight !== this.lastHighlight;

    if (candidatesAreStale) {
      this.rebuildDecorations(update.view, highlight);
      return;
    }

    if (update.selectionSet) {
      const previousSelection =
        this.lastSelection ?? update.startState.selection;
      this.updateSelection(previousSelection, update.state.selection);
      this.lastSelection = update.state.selection;
    }
  }

  destroy() {}

  private rebuildDecorations(view: EditorView, highlight: boolean) {
    const candidates = this.collectCandidates(view);
    const builder = new RangeSetBuilder<Decoration>();
    let widgetIndex = 0;

    for (const candidate of candidates) {
      const widget = this.createWidget(candidate, highlight, widgetIndex);
      if (candidate.kind === "space") widgetIndex++;

      candidate.decoration = Decoration.replace({ widget });
      candidate.decorated = !this.isRangeSelected(
        candidate.spanFrom,
        candidate.spanTo,
        view.state.selection,
      );

      if (candidate.decorated) {
        builder.add(candidate.from, candidate.to, candidate.decoration);
      }
    }

    this.candidates = candidates;
    this.decorations = builder.finish();
    this.lastSelection = view.state.selection;
    this.lastHighlight = highlight;
    this.cacheValid = true;
  }

  private collectCandidates(view: EditorView): Candidate[] {
    const candidates: Candidate[] = [];
    const seenSpans = new Set<string>();

    // Keep the shared node-name/span helpers here so nested blocks such as
    // callouts, lists, and blockquotes follow the same discovery path.
    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (node) => {
          if (!isInlineCodeNode(node.type.name)) return;

          const span = getInlineCodeSpan(view.state.doc, node.from, node.to);
          const spanKey = `${span.from}:${span.to}`;
          if (seenSpans.has(spanKey)) return;
          seenSpans.add(spanKey);

          const text = span.text.trim();
          const kind = this.getWidgetKind(text);
          if (!kind) return;

          candidates.push({
            from: node.from,
            to: node.to,
            spanFrom: span.from,
            spanTo: span.to,
            node: node.node,
            text,
            meta: `${span.from}:${span.to}:${text}`,
            kind,
            decorated: false,
          });
        },
      });
    }

    return candidates.sort((left, right) => left.spanFrom - right.spanFrom);
  }

  private getWidgetKind(text: string): WidgetKind | undefined {
    if (DICE_REGEX.test(text)) return "dice";
    if (COUNT_REGEX.test(text)) return "count";
    if (COUNT_LIMIT_REGEX.test(text)) return "countlimit";
    if (TRACK_REGEX.test(text)) return "track";
    if (CLOCK_REGEX.test(text)) return "clock";
    if (SPACE_REGEX.test(text)) return "space";
    return undefined;
  }

  private createWidget(
    candidate: Candidate,
    highlight: boolean,
    widgetIndex: number,
  ): WidgetType {
    const { node, text, kind, meta } = candidate;

    switch (kind) {
      case "dice":
        return new DiceWidget({ originalNode: node, originalText: text });
      case "count":
        return new CountWidget({ originalNode: node, originalText: text });
      case "countlimit":
        return new CountLimitWidget({ originalNode: node, originalText: text });
      case "track":
        return new TrackWidget({
          originalNode: node,
          originalText: text,
          highlight,
        });
      case "clock":
        return new ClockWidget({ originalNode: node, originalText: text });
      case "space":
        return new SpaceWidget({
          originalNode: node,
          originalText: text,
          initialWidth:
            this.spaceStore[meta] || this.spaceStoreIndex[widgetIndex] || 0,
          updateInitialWidth: (width: number) => {
            this.spaceStore[meta] = width;
            this.spaceStoreIndex[widgetIndex] = width;
          },
        });
      default: {
        const unreachable: never = kind;
        return unreachable;
      }
    }
  }

  private updateSelection(
    previousSelection: EditorSelection,
    selection: EditorSelection,
  ) {
    const affectedCandidates = this.getAffectedCandidates(
      previousSelection,
      selection,
    );

    for (const candidate of affectedCandidates) {
      const shouldDecorate = !this.isRangeSelected(
        candidate.spanFrom,
        candidate.spanTo,
        selection,
      );
      if (shouldDecorate === candidate.decorated) continue;

      const decoration = candidate.decoration;
      if (!decoration) continue;

      if (shouldDecorate) {
        this.decorations = this.decorations.update({
          add: [decoration.range(candidate.from, candidate.to)],
        });
      } else {
        this.decorations = this.decorations.update({
          filterFrom: candidate.from,
          filterTo: candidate.to,
          filter: (from, to, value) =>
            from !== candidate.from ||
            to !== candidate.to ||
            value !== decoration,
        });
      }

      candidate.decorated = shouldDecorate;
    }
  }

  /**
   * Find only spans that could change visibility. For the normal single-range
   * selection, movement within an overlapping selection changes visibility
   * only near its endpoints. Multi-range selections use a straightforward
   * cached-candidate pass; neither path reparses the syntax tree.
   */
  private getAffectedCandidates(
    previousSelection: EditorSelection,
    selection: EditorSelection,
  ): Candidate[] {
    if (
      previousSelection.ranges.length !== 1 ||
      selection.ranges.length !== 1
    ) {
      return this.candidates;
    }

    const previous = previousSelection.ranges[0];
    const next = selection.ranges[0];
    const intervals: PositionRange[] = [];

    if (previous.empty && next.empty) {
      intervals.push(
        { from: previous.head, to: previous.head },
        { from: next.head, to: next.head },
      );
      return this.findCandidatesInRanges(intervals);
    }

    const overlaps = previous.from <= next.to && next.from <= previous.to;
    if (overlaps) {
      if (previous.from !== next.from) {
        intervals.push({
          from: Math.min(previous.from, next.from),
          to: Math.max(previous.from, next.from),
        });
      }
      if (previous.to !== next.to) {
        intervals.push({
          from: Math.min(previous.to, next.to),
          to: Math.max(previous.to, next.to),
        });
      }
    } else {
      intervals.push(
        { from: previous.from, to: previous.to },
        { from: next.from, to: next.to },
      );
    }

    return this.findCandidatesInRanges(intervals);
  }

  private findCandidatesInRanges(intervals: PositionRange[]): Candidate[] {
    const found = new Set<Candidate>();

    for (const interval of intervals) {
      let low = 0;
      let high = this.candidates.length;

      // Inline code spans are ordered and non-overlapping in the syntax tree.
      // Binary search avoids checking every candidate for ordinary cursor moves.
      while (low < high) {
        const middle = (low + high) >>> 1;
        if (this.candidates[middle].spanTo < interval.from) {
          low = middle + 1;
        } else {
          high = middle;
        }
      }

      for (
        let index = low;
        index < this.candidates.length &&
        this.candidates[index].spanFrom <= interval.to;
        index++
      ) {
        found.add(this.candidates[index]);
      }
    }

    return Array.from(found);
  }

  private isRangeSelected(
    from: number,
    to: number,
    selection: EditorSelection,
  ): boolean {
    return !!selection.ranges.find((range: SelectionRange) =>
      this.rangeIntersects(from, to, range),
    );
  }

  private rangeIntersects(
    from: number,
    to: number,
    range: SelectionRange,
  ): boolean {
    return range.from <= to && range.to >= from;
  }
}

const pluginSpec: PluginSpec<TrackPlugin> = {
  decorations: (value: TrackPlugin) => value.decorations,
};

export const soloToolkitExtension = (plugin: Plugin) => {
  pluginRef = plugin;
  return ViewPlugin.fromClass(TrackPlugin, pluginSpec);
};
