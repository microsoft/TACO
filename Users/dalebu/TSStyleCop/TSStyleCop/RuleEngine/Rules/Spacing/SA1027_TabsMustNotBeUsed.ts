
/// <reference path="../../IStyleRule.ts" />

module TSStyleCop.Rules {
    export class TabsMustNotBeUsed implements IStyleRule<TypeScript.SyntaxTrivia> {
        public code = "SA1027";
        public name = "TabsMustNotBeUsed";

        public filter = [TypeScript.SyntaxKind.MultiLineCommentTrivia, TypeScript.SyntaxKind.WhitespaceTrivia, TypeScript.SyntaxKind.SingleLineCommentTrivia];

        public checkElement(whitespace: TypeScript.SyntaxTrivia, context: RuleContext, position?: number): void {
            var text = whitespace.fullText();
            if (text.indexOf("\t") >= 0) {
                context.autoCorrectOrError(() => {
                    context.autoCorrectText(whitespace, text.replace(/\t/g, "    "));
                }, null, this.name, this.code, position + text.indexOf("\t"), 0);
            }
        }
    }
}