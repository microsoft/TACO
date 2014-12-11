
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />

module TSStyleCop.Rules {
    export class CurlyBracketsMustBeOnCorrectLine implements IStyleRule<TypeScript.ISyntaxNode> {
        public code = "SA1500";
        public name = "CurlyBracketsMustBeOnCorrectLine";

        public filter = RuleHelpers.BlockNodeTypes;

        public checkElement(node: TypeScript.ISyntaxNode, context: RuleContext): void {
            var parent = <TypeScript.ISyntaxNode>context.getParent(node);
            var openBrace = (<any>node).openBraceToken;
            var children = RuleHelpers.getBlockContents(node);
            var closeBrace = (<any>node).closeBraceToken;
            if (children.childCount() > 0) {
                var openBraceLine = context.lineMap.getLineNumberFromPosition(context.start(openBrace));
                var closeBraceLine = context.lineMap.getLineNumberFromPosition(context.start(closeBrace));
                var firstChild = children.childAt(0);
                var lastChild = children.childAt(children.childCount() - 1);
                var firstStatementLine = context.lineMap.getLineNumberFromPosition(context.start(firstChild));
                var lastStatementLine = context.lineMap.getLineNumberFromPosition(context.end(lastChild));
                if (openBraceLine === closeBraceLine &&
                    openBraceLine === firstStatementLine &&
                    firstStatementLine === lastStatementLine) {
                        return;
                }

                if (context.isFirstTokenInLine(openBrace) && parent.kind() !== TypeScript.SyntaxKind.Block) {
                    context.autoCorrectOrError(() => {
                        context.clearLeadingWhitespace(openBrace);
                        context.autoCorrectText(openBrace, " " + openBrace.text());
                    }, openBrace, this.name, this.code);
                } else if (openBraceLine === firstStatementLine) {
                    context.autoCorrectOrError(() => {
                        context.clearTrailingWhitespace(openBrace);
                        context.autoCorrectText(openBrace, openBrace.text() + TypeScript.newLine() + RuleHelpers.createIndent(context.getIndent(openBrace) + 1));
                    }, openBrace, this.name, this.code);
                }

                var nextToken = context.getNextToken(closeBrace);
                var nextTokenLine = context.lineMap.getLineNumberFromPosition(context.start(nextToken));
                var nextTokenKind = nextToken.tokenKind;

                if (nextToken.tokenKind === TypeScript.SyntaxKind.WhileKeyword && context.getParent(nextToken).kind() !== TypeScript.SyntaxKind.DoStatement) {
                    // Clear out the next token kind because we don't want it treated like a do while expression
                    nextTokenKind = null;
                }

                switch (nextTokenKind) {
                    case TypeScript.SyntaxKind.EndOfFileToken:
                    case TypeScript.SyntaxKind.CloseParenToken:
                    case TypeScript.SyntaxKind.CommaToken:
                    case TypeScript.SyntaxKind.DotToken:
                    case TypeScript.SyntaxKind.SemicolonToken:
                    case TypeScript.SyntaxKind.CloseBracketToken:
                        if (closeBraceLine !== nextTokenLine && nextToken.width()) {
                            context.autoCorrectOrError(() => {
                                context.clearTrailingWhitespace(closeBrace);
                            }, nextToken, this.name, this.code);
                        }

                        break;
                    case TypeScript.SyntaxKind.ElseKeyword:
                    case TypeScript.SyntaxKind.CatchKeyword:
                    case TypeScript.SyntaxKind.FinallyKeyword:
                    case TypeScript.SyntaxKind.WhileKeyword:
                        if (closeBraceLine !== nextTokenLine) {
                            context.autoCorrectOrError(() => {
                                context.clearTrailingWhitespace(closeBrace);
                                context.autoCorrectText(closeBrace, closeBrace.text() + " ");
                            }, nextToken, this.name, this.code);
                        }

                        break;
                    default:
                        if (closeBraceLine === nextTokenLine) {
                            context.reportError(closeBrace, this.name, this.code);
                        }

                        break;
                }

                if (closeBraceLine === lastStatementLine) {
                    context.reportError(closeBrace, this.name, this.code);
                }
            }
        }
    }
}