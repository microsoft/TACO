
/// <reference path="../../IStyleRule.ts" />
/// <reference path="SpacingHelpers.ts" />

module TSStyleCop.Rules {
    export class OpeningCurlyBracketsMustBeSpacedCorrectly implements IStyleRule<TypeScript.ISyntaxToken> {
        public code = "SA1012";
        public name = "OpeningCurlyBracketsMustBeSpacedCorrectly";

        public filter = [TypeScript.SyntaxKind.OpenBraceToken];

        public checkElement(openBrace: TypeScript.ISyntaxToken, context: RuleContext): void {
            var prevToken = context.getPreviousToken(openBrace);
            if (prevToken.tokenKind === TypeScript.SyntaxKind.GreaterThanToken &&
                context.getParent(prevToken).kind() === TypeScript.SyntaxKind.CastExpression) {
                SpacingHelpers.errorIfLeadingWhitespace(openBrace, context, this.name, this.code, false);
            } else {
                SpacingHelpers.errorIfNotLeadingWhitespace(openBrace, context, this.name, this.code, true, true);
            }

            SpacingHelpers.errorIfNotTrailingWhitespace(openBrace, context, this.name, this.code, true, true);
        }
    }
}