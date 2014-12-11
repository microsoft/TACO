
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../../Utils.ts" />
/// <reference path="SpacingHelpers.ts" />

module TSStyleCop.Rules {
    export class SemicolonsMustBeSpacedCorrectly implements IStyleRule<TypeScript.ISyntaxToken> {
        public code = "SA1002";
        public name = "SemicolonsMustBeSpacedCorrectly";

        public filter = [TypeScript.SyntaxKind.SemicolonToken];

        public checkElement(semicolon: TypeScript.ISyntaxToken, context: RuleContext): void {
            if (semicolon.width()) {
                var nextToken = context.getNextToken(semicolon);
                var nextTokenKind = nextToken.tokenKind;

                SpacingHelpers.errorIfLeadingWhitespace(semicolon, context, this.name, this.code, false);
                if (nextTokenKind !== TypeScript.SyntaxKind.CloseParenToken) {
                    SpacingHelpers.errorIfNotTrailingWhitespace(semicolon, context, this.name, this.code, true, false);
                }
            }
        }
    }
}