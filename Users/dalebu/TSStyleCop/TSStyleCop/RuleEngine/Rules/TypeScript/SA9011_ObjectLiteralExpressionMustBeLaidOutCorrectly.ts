
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />
/// <reference path="../Spacing/SpacingHelpers.ts" />

module TSStyleCop.Rules {
    export class ObjectLiteralExpressionMustBeLaidOutCorrectly implements IStyleRule<TypeScript.ISyntaxElement> {
        public code = "SA9011";
        public name = "ObjectLiteralExpressionMustBeLaidOutCorrectly";

        public filter = [TypeScript.SyntaxKind.ColonToken, TypeScript.SyntaxKind.ObjectLiteralExpression];

        public checkElement(token: TypeScript.ISyntaxElement, context: RuleContext): void {
            var parent = context.getParent(token);
            var grandParent = context.getParent(parent);
            if (token.isToken() && (<TypeScript.ISyntaxToken>token).tokenKind === TypeScript.SyntaxKind.ColonToken) {
                if (grandParent.kind() === TypeScript.SyntaxKind.PropertySignature || grandParent.kind() === TypeScript.SyntaxKind.ObjectLiteralExpression) {
                    var nextToken: TypeScript.ISyntaxToken = context.getNextToken((<TypeScript.ISyntaxToken>token));
                    var colonLine: number = context.lineMap.getLineNumberFromPosition(context.start((<TypeScript.ISyntaxToken>token)));
                    var nextTokenLine = context.lineMap.getLineNumberFromPosition(context.start(nextToken));
                    if (colonLine !== nextTokenLine) {
                        context.autoCorrectOrError(() => {
                            var colon: TypeScript.ISyntaxToken = context.getPreviousToken(nextToken);
                            context.clearTrailingWhitespace(colon);
                            context.autoCorrectText(colon, ": ");
                        }, nextToken, this.name, this.code);
                    }
                }
            } else if (token.isNode() && (<TypeScript.ISyntaxNode>token).kind() === TypeScript.SyntaxKind.ObjectLiteralExpression) {
                var openBrace: TypeScript.ISyntaxToken = (<TypeScript.ObjectLiteralExpressionSyntax>token).openBraceToken;
                var closeBrace: TypeScript.ISyntaxToken = (<TypeScript.ObjectLiteralExpressionSyntax>token).closeBraceToken;
                var openBraceLine: number = context.lineMap.getLineNumberFromPosition(context.start(openBrace));
                var closeBraceLine: number = context.lineMap.getLineNumberFromPosition(context.start(closeBrace));
                if (openBraceLine === closeBraceLine && context.getNextToken(openBrace) !== closeBrace) {
                    SpacingHelpers.errorIfNotLeadingWhitespace(closeBrace, context, this.name, this.code, false, true);
                    SpacingHelpers.errorIfNotTrailingWhitespace(openBrace, context, this.name, this.code, true, true);
                }
            }
        }
    }
}