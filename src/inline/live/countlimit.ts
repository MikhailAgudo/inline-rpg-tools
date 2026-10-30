import { SyntaxNode } from "@lezer/common";
import { EditorView, WidgetType } from "@codemirror/view";
import { CountLimitWidgetBase, COUNT_LIMIT_REGEX } from "../base";
import { focusOnNode, replaceInlineCode } from "./shared";

export { COUNT_LIMIT_REGEX };

export class CountLimitWidget extends WidgetType {
  base: CountLimitWidgetBase;
  node: SyntaxNode;
  originalText: string;

  constructor(opts: { originalNode: SyntaxNode; originalText: string }) {
    super();

    this.base = new CountLimitWidgetBase(opts);
    this.node = opts.originalNode;
    this.originalText = opts.originalText;
  }

  eq(widget: CountLimitWidget): boolean {
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
