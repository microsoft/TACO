
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />

module TSStyleCop.Rules {
    export class ClosingCurlyBracketMustBeFollowedByBlankLine implements IStyleRule<TypeScript.ISyntaxNode> {
        public code = "SA1513";
        public name = "ClosingCurlyBracketMustBeFollowedByBlankLine";

        public filter = RuleHelpers.BlockNodeTypes;

        public checkElement(node: TypeScript.ISyntaxNode, context: RuleContext): void {
            var openBrace = (<any>node).openBraceToken;
            var closeBrace = (<any>node).closeBraceToken;
            var openBraceLine = context.lineMap.getLineNumberFromPosition(context.start(openBrace));
            var closeBraceLine = context.lineMap.getLineNumberFromPosition(context.start(closeBrace));
            if (openBraceLine === closeBraceLine) {
                return;
            }

            // We allow grouping accessors together as they're conceptually one unit. Unfortunately this exclusion
            // means we won't catch cases where another member declaration is immediately following a set/get accessor
            // declaration. We could consider checking the parent of the token after the close brace to add this support,
            // but it doesn't seem worth the complexity for the moment.
            var parent: TypeScript.ISyntaxNode = context.getParent(node);
            if (parent) {
                var kind: TypeScript.SyntaxKind = parent.kind();

                if (kind === TypeScript.SyntaxKind.GetMemberAccessorDeclaration || kind === TypeScript.SyntaxKind.SetMemberAccessorDeclaration) {
                    return;
                }
            }

            var nextToken = context.getNextToken(closeBrace);
            if (nextToken.tokenKind === TypeScript.SyntaxKind.SemicolonToken) {
                return;
            }

            switch (nextToken.tokenKind) {
                case TypeScript.SyntaxKind.CloseBraceToken:
                case TypeScript.SyntaxKind.ElseKeyword:
                case TypeScript.SyntaxKind.CatchKeyword:
                case TypeScript.SyntaxKind.FinallyKeyword:
                case TypeScript.SyntaxKind.CommaToken:
                case TypeScript.SyntaxKind.EndOfFileToken:
                case TypeScript.SyntaxKind.DotToken:
                case TypeScript.SyntaxKind.CloseParenToken:
                    return;
                default:
                    if (!context.isWhitespaceLine(closeBraceLine + 1)) {
                        context.autoCorrectOrError(() => {
                            context.autoCorrectText(closeBrace, closeBrace.text() + TypeScript.newLine());
                        }, closeBrace, this.name, this.code);
                    }

                    break;
            }
        }
    }
}