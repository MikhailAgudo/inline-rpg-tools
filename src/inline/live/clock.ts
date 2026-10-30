import { SyntaxNode } from "@lezer/common";
import { EditorView, WidgetType } from "@codemirror/view";
import { ClockWidgetBase, CLOCK_REGEX } from "../base";
import { focusOnNode, replaceInlineCode } from "./shared";

export { CLOCK_REGEX };

export class ClockWidget extends WidgetType {
  base: ClockWidgetBase;
  node: SyntaxNode;
  originalText: string;

  constructor(opts: { originalNode: SyntaxNode; originalText: string }) {
    super();

    this.base = new ClockWidgetBase(opts);
    this.node = opts.originalNode;
    this.originalText = opts.originalText;
  }

  eq(widget: ClockWidget): boolean {
    const equal = this.originalText === widget.originalText;
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
