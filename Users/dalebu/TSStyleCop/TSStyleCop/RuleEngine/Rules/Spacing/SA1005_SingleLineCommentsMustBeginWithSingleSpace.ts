
/// <reference path="../../IStyleRule.ts" />

module TSStyleCop.Rules {
    export class SingleLineCommentsMustBeginWithSingleSpace implements IStyleRule<TypeScript.SyntaxTrivia> {
        public code = "SA1005";
        public name = "SingleLineCommentsMustBeginWithSingleSpace";

        public filter = [TypeScript.SyntaxKind.SingleLineCommentTrivia];

        public checkElement(comment: TypeScript.SyntaxTrivia, context: RuleContext, position?: number): void {
            var text = comment.fullText();
            if (text.substr(0, 4) === "////") {
                return;
            } else if (text.substr(0, 3) === "///") {
                if (text.length > 3 && text.charAt(3) !== " ") {
                    context.autoCorrectOrError(() => {
                        context.autoCorrectText(comment, "/// " + text.substr(3));
                    }, null, this.name, this.code, position, text.length);
                }
            } else if (text.substr(0, 2) === "//") {
                if (text.length > 2 && text.charAt(2) !== " ") {
                    context.autoCorrectOrError(() => {
                        context.autoCorrectText(comment, "// " + text.substr(2));
                    }, null, this.name, this.code, position, text.length);
                }
            }
        }
    }
}