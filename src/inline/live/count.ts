import { SyntaxNode } from "@lezer/common";
import { EditorView, WidgetType } from "@codemirror/view";
import { CountWidgetBase, COUNT_REGEX } from "../base";
import { focusOnNode, replaceInlineCode } from "./shared";

export { COUNT_REGEX };

export class CountWidget extends WidgetType {
  base: CountWidgetBase;
  node: SyntaxNode;
  originalText: string;

  constructor(opts: { originalNode: SyntaxNode; originalText: string }) {
    super();

    this.base = new CountWidgetBase(opts);
    this.node = opts.originalNode;
    this.originalText = opts.originalText;
  }

  eq(widget: CountWidget): boolean {
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
