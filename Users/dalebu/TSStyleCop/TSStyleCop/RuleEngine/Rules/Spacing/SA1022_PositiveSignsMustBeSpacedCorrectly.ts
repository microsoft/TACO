
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../../Utils.ts" />
/// <reference path="SpacingHelpers.ts" />

module TSStyleCop.Rules {
    export class PositiveSignsMustBeSpacedCorrectly implements IStyleRule<TypeScript.BinaryExpressionSyntax> {
        public code: string = "SA1022";
        public name: string = "PositiveSignsMustBeSpacedCorrectly";

        public filter: TypeScript.SyntaxKind[] = [TypeScript.SyntaxKind.PlusExpression];

        public checkElement(plusExpression: TypeScript.BinaryExpressionSyntax, context: RuleContext): void {
            var plusToken = plusExpression.operatorToken;
            SpacingHelpers.errorIfNotLeadingWhitespace(plusToken, context, this.name, this.code, false, true);
            SpacingHelpers.errorIfTrailingWhitespace(plusToken, context, this.name, this.code, false);
        }
    }
}