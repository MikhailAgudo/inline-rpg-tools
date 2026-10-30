import { SyntaxNode } from "@lezer/common";
import { EditorView, WidgetType } from "@codemirror/view";
import { TrackWidgetBase, TRACK_REGEX } from "../base";
import { focusOnNode, replaceInlineCode } from "./shared";

export { TRACK_REGEX };

export class TrackWidget extends WidgetType {
  base: TrackWidgetBase;
  node: SyntaxNode;
  originalText: string;
  highlight: boolean;

  constructor(opts: {
    originalNode: SyntaxNode;
    originalText: string;
    highlight: boolean;
  }) {
    super();

    this.base = new TrackWidgetBase(opts);
    this.node = opts.originalNode;
    this.originalText = opts.originalText;
    this.highlight = opts.highlight;
  }

  eq(widget: TrackWidget): boolean {
    const equal =
      this.originalText === widget.originalText &&
      this.highlight === widget.highlight;
    if (equal) this.node = widget.node;
    return equal;
  }

  updateDoc(view: EditorView) {
    replaceInlineCode(view, this.node, (wrap) => this.base.getText(wrap));
  }

  toDOM(view: EditorView): HTMLElement {
    this.base.generateDOM({
      onFocus: () => {
        focusOnNode(view, this.node);
      },
      onChange: () => this.updateDoc(view),
    });

    return this.base.el;
  }
}
