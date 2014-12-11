
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../../Utils.ts" />
/// <reference path="SpacingHelpers.ts" />

module TSStyleCop.Rules {
    export class NegativeSignsMustBeSpacedCorrectly implements IStyleRule<TypeScript.PrefixUnaryExpressionSyntax> {
        public code: string = "SA1021";
        public name: string = "NegativeSignsMustBeSpacedCorrectly";

        public filter: TypeScript.SyntaxKind[] = [TypeScript.SyntaxKind.NegateExpression];

        public checkElement(negateExpression: TypeScript.PrefixUnaryExpressionSyntax, context: RuleContext): void {
            var minusToken = negateExpression.operatorToken;
            SpacingHelpers.errorIfNotLeadingWhitespace(minusToken, context, this.name, this.code, /* allowStartOfLine = */ true, /* allowOpenParen = */ true);
            SpacingHelpers.errorIfTrailingWhitespace(minusToken, context, this.name, this.code, /* allowEndOfLine = */ false);
        }
    }
}