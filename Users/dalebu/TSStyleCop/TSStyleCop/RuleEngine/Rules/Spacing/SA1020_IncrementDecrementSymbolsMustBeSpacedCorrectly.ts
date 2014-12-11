
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../../Utils.ts" />
/// <reference path="SpacingHelpers.ts" />

module TSStyleCop.Rules {
    export class IncrementDecrementSymbolsMustBeSpacedCorrectly implements IStyleRule<TypeScript.ISyntaxNode> {
        public code = "SA1020";
        public name = "IncrementDecrementSymbolsMustBeSpacedCorrectly";

        public filter = [
            TypeScript.SyntaxKind.PreDecrementExpression,
            TypeScript.SyntaxKind.PreIncrementExpression,
            TypeScript.SyntaxKind.PostDecrementExpression,
            TypeScript.SyntaxKind.PostIncrementExpression];

        public checkElement(expression: TypeScript.ISyntaxNode, context: RuleContext): void {
            var token = (<any>expression).operatorToken;
            switch (expression.kind()) {
                case TypeScript.SyntaxKind.PreDecrementExpression:
                case TypeScript.SyntaxKind.PreIncrementExpression:
                    SpacingHelpers.errorIfNotLeadingWhitespace(token, context, this.name, this.code, true, true);
                    SpacingHelpers.errorIfTrailingWhitespace(token, context, this.name, this.code, false);
                    break;
                case TypeScript.SyntaxKind.PostDecrementExpression:
                case TypeScript.SyntaxKind.PostIncrementExpression:
                    SpacingHelpers.errorIfLeadingWhitespace(token, context, this.name, this.code, true);
                    SpacingHelpers.errorIfNotTrailingWhitespace(token, context, this.name, this.code, true, true);
                    break;
            }
        }
    }
}