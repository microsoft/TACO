
/// <reference path="../../IStyleRule.ts" />
/// <reference path="SpacingHelpers.ts" />

module TSStyleCop.Rules {
    export class OpeningParenthesisMustBeSpacedCorrectly implements IStyleRule<TypeScript.ISyntaxToken> {
        public code = "SA1008";
        public name = "OpeningParenthesisMustBeSpacedCorrectly";

        public filter = [TypeScript.SyntaxKind.OpenParenToken];

        public checkElement(openParen: TypeScript.ISyntaxToken, context: RuleContext): void {
            var prevToken = context.getPreviousToken(openParen);
            switch (prevToken.tokenKind) {
                case TypeScript.SyntaxKind.IfKeyword:
                case TypeScript.SyntaxKind.ForKeyword:
                case TypeScript.SyntaxKind.SwitchKeyword:
                case TypeScript.SyntaxKind.WhileKeyword:
                case TypeScript.SyntaxKind.CatchKeyword:
                case TypeScript.SyntaxKind.FunctionKeyword:
                case TypeScript.SyntaxKind.ReturnKeyword:
                case TypeScript.SyntaxKind.ColonToken:
                case TypeScript.SyntaxKind.QuestionToken:
                case TypeScript.SyntaxKind.TypeOfKeyword:
                case TypeScript.SyntaxKind.EqualsGreaterThanToken:
                case TypeScript.SyntaxKind.OpenBraceToken:
                case TypeScript.SyntaxKind.RequireKeyword:
                    break;
                default:
                    if (!TypeScript.SyntaxFacts.isBinaryExpressionOperatorToken(prevToken.tokenKind)) {
                        SpacingHelpers.errorIfLeadingWhitespace(openParen, context, this.name, this.code, true);
                    }
            }

            SpacingHelpers.errorIfTrailingWhitespace(openParen, context, this.name, this.code, true);
        }
    }
}