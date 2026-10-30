import { SyntaxNode } from "@lezer/common";
import { Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export const isInlineCodeNode = (name: string): boolean => {
  if (name.includes("formatting")) return false;
  return (
    name === "inline-code" ||
    name === "InlineCode" ||
    name.includes("inline-code") ||
    name.includes("InlineCode")
  );
};

const isBacktickWrapped = (text: string): boolean =>
  text.startsWith("`") && text.endsWith("`") && text.length >= 2;

export const getInlineCodeSpan = (
  doc: Text,
  from: number,
  to: number,
): { from: number; to: number; text: string } => {
  const inner = doc.sliceString(from, to);
  if (isBacktickWrapped(inner)) {
    return { from, to, text: inner };
  }

  const expandedFrom = Math.max(0, from - 1);
  const expandedTo = Math.min(doc.length, to + 1);
  const expanded = doc.sliceString(expandedFrom, expandedTo);
  if (isBacktickWrapped(expanded)) {
    return { from: expandedFrom, to: expandedTo, text: expanded };
  }

  const left = doc.sliceString(expandedFrom, to);
  if (isBacktickWrapped(left)) {
    return { from: expandedFrom, to, text: left };
  }

  const right = doc.sliceString(from, expandedTo);
  if (isBacktickWrapped(right)) {
    return { from, to: expandedTo, text: right };
  }

  return { from, to, text: inner };
};

export const replaceInlineCode = (
  view: EditorView,
  node: SyntaxNode,
  getText: (wrap?: string) => string,
) => {
  const current = view.state.doc.sliceString(node.from, node.to);
  const wrap = isBacktickWrapped(current) ? "`" : "";
  view.dispatch({
    changes: [
      {
        from: node.from,
        to: node.to,
        insert: getText(wrap),
      },
    ],
  });
};

export const focusOnNode = (view: EditorView, node: SyntaxNode) => {
  const pos = node.to;
  view.dispatch({
    selection: { anchor: pos, head: pos },
  });
  // FIXME: for some reason this.node.to results in: `1`|
  //        while this.node.to - 1 results in: `|1`
  //        thus a timeout fix :(
  setTimeout(() => {
    view.dispatch({
      selection: { anchor: pos, head: pos },
    });
  }, 33);
};
