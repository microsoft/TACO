
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../../Utils.ts" />

module TSStyleCop.Rules {
    export class DoNotUseAutomaticSemicolons implements IStyleRule<TypeScript.ISyntaxToken> {
        public code = "SA9006";
        public name = "DoNotUseAutomaticSemicolons";

        public filter = [TypeScript.SyntaxKind.SemicolonToken];

        public checkElement(semicolon: TypeScript.ISyntaxToken, context: RuleContext): void {
            if (!semicolon.width()) {
                var prevToken = context.getPreviousToken(semicolon);
                context.autoCorrectOrError(() => {
                    context.autoCorrectText(prevToken, prevToken.text() + ";");
                }, null, this.name, this.code, context.end(prevToken), 0);
            }
        }
    }
}