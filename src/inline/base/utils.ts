import { App, Editor, MarkdownView } from "obsidian";
import { EditorView } from "@codemirror/view";

type EditorWithPosAtMouse = Editor & {
  posAtMouse?: (event: MouseEvent) => { line: number; ch: number };
  cm?: EditorView;
};

const isQuoteLine = (text: string): boolean => text.trim().startsWith(">");
const isCalloutHeader = (text: string): boolean =>
  text.trim().startsWith("> [!");

const findQuoteLinesFromDOM = (
  cm: EditorView,
  el: HTMLElement,
  treatAsCallout: boolean,
): [number, number] | null => {
  try {
    // posAtDOM maps the block DOM node back to the CodeMirror document position
    const pos = cm.posAtDOM(el);
    if (pos === null || pos === undefined) return null;

    const doc = cm.state.doc;
    const startLineObj = doc.lineAt(pos);
    let lineStart = startLineObj.number - 1; // 0-indexed line

    // If posAtDOM landed inside a quote/callout body, step backward along '>' lines
    while (lineStart > 0) {
      const currentText = doc.line(lineStart + 1).text;
      if (treatAsCallout && isCalloutHeader(currentText)) {
        break;
      }
      const prevText = doc.line(lineStart).text;
      if (isQuoteLine(prevText)) {
        lineStart--;
      } else {
        break;
      }
    }

    let lineEnd = lineStart;
    while (lineEnd + 1 < doc.lines) {
      const nextLineText = doc.line(lineEnd + 2).text;
      // Adjacent callouts start a new block even without a blank line
      if (isCalloutHeader(nextLineText)) {
        break;
      }
      if (isQuoteLine(nextLineText)) {
        lineEnd++;
      } else {
        break;
      }
    }

    return [lineStart, lineEnd];
  } catch (e) {
    return null;
  }
};

const findParentWidgetLines = ({
  app,
  event,
  el,
}: {
  app: App;
  event: MouseEvent;
  el?: HTMLElement;
}): [number, number] => {
  let lineStart = -1;
  let lineEnd = -1;

  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view) return [lineStart, lineEnd];

  const target = (event?.target as HTMLElement | undefined) || el;
  const calloutEl = target?.closest?.(".callout") as HTMLElement | null;
  const quoteEl = target?.closest?.(
    "blockquote, .cm-quote, .HyperMD-quote-line",
  ) as HTMLElement | null;
  const listEl = target?.closest?.("li, .HyperMD-list-line") as HTMLElement | null;

  // Access the CodeMirror EditorView
  const cm =
    (view.editor as EditorWithPosAtMouse)?.cm ||
    (target ? EditorView.findFromDOM(target) : undefined);

  // 1. Precise CodeMirror DOM mapping for callouts and blockquotes in Live Preview
  if (cm && calloutEl) {
    const lines = findQuoteLinesFromDOM(cm, calloutEl, true);
    if (lines) return lines;
  }
  if (cm && quoteEl) {
    const lines = findQuoteLinesFromDOM(cm, quoteEl, false);
    if (lines) return lines;
  }

  // 2. Generic CodeMirror DOM mapping for lists and other Live Preview widgets
  const mappedEl = listEl || target;
  if (cm && mappedEl) {
    try {
      const pos = cm.posAtDOM(mappedEl);
      if (pos !== null && pos !== undefined) {
        const line = cm.state.doc.lineAt(pos).number - 1;
        return [line, line];
      }
    } catch (e) {
      // Fall through to fallback
    }
  }

  // 3. Fallback using editor.posAtMouse
  const editor = view.editor as EditorWithPosAtMouse;
  if (editor?.posAtMouse && typeof editor.posAtMouse === "function") {
    const position = editor.posAtMouse(event);
    if (position) {
      lineStart = position.line;
      lineEnd = position.line;

      // Expand consecutive '>' lines for callouts and blockquotes
      if ((calloutEl || quoteEl) && editor.lineCount) {
        const totalLines = editor.lineCount();
        while (lineStart > 0) {
          const currentText = editor.getLine(lineStart);
          if (calloutEl && isCalloutHeader(currentText)) break;
          const prevText = editor.getLine(lineStart - 1);
          if (isQuoteLine(prevText)) {
            lineStart--;
          } else {
            break;
          }
        }
        while (lineEnd + 1 < totalLines) {
          const nextText = editor.getLine(lineEnd + 1);
          if (isCalloutHeader(nextText)) break;
          if (isQuoteLine(nextText)) {
            lineEnd++;
          } else {
            break;
          }
        }
      }
    }
  }

  return [lineStart, lineEnd];
};

export const getWidgetLines = (
  widget: {
    lineStart: number;
    lineEnd: number;
    app: App;
    base?: { el?: HTMLElement };
  },
  event: MouseEvent,
): [number, number] => {
  if (
    (widget.lineStart === -1 || widget.lineEnd === -1) &&
    (event || widget.base?.el)
  ) {
    return findParentWidgetLines({
      app: widget.app,
      event,
      el: widget.base?.el,
    });
  } else {
    return [widget.lineStart, widget.lineEnd];
  }
};
