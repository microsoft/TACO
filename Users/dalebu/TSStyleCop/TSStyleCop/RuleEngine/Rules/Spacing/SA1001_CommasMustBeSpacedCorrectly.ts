
/// <reference path="../../IStyleRule.ts" />
/// <reference path="SpacingHelpers.ts" />

module TSStyleCop.Rules {
    export class CommasMustBeSpacedCorrectly implements IStyleRule<TypeScript.ISyntaxToken> {
        public code = "SA1001";
        public name = "CommasMustBeSpacedCorrectly";

        public filter = [TypeScript.SyntaxKind.CommaToken];

        public checkElement(comma: TypeScript.ISyntaxToken, context: RuleContext): void {
            SpacingHelpers.errorIfLeadingWhitespace(comma, context, this.name, this.code, false);
            SpacingHelpers.errorIfNotTrailingWhitespace(comma, context, this.name, this.code, true, false);
        }
    }
}