
/// <reference path="../../IStyleRule.ts" />

module TSStyleCop.Rules {
    export class SpacingHelpers {
        public static errorIfLeadingWhitespace(token: TypeScript.ISyntaxToken, context: RuleContext, message: string, code: string, allowStartOfLine: boolean): void {
            var leadingWhitespace = context.getLeadingWhitespace(token);
            if (!leadingWhitespace || (allowStartOfLine && context.isFirstTokenInLine(token))) {
                return;
            } else {
                context.autoCorrectOrError(() => {
                    context.clearLeadingWhitespace(token);
                }, token, message, code);
            }
        }

        public static errorIfNotLeadingWhitespace(token: TypeScript.ISyntaxToken, context: RuleContext, message: string, code: string, allowStartOfLine: boolean, allowOpenParen: boolean, moveToPrevLine?: boolean): void {
            var leadingWhitespace = context.getLeadingWhitespace(token);
            var prevToken = context.getPreviousToken(token);
            var prevTokenKind = prevToken.tokenKind;
            if (leadingWhitespace === " " ||
                (leadingWhitespace.length > 3 && !context.isFirstTokenInLine(token)) ||     // Allow multiple spaces if there's more than 3 for cases where trying to align multiple lines
                (allowStartOfLine && context.isFirstTokenInLine(token)) ||
                (allowOpenParen && prevTokenKind === TypeScript.SyntaxKind.OpenParenToken) ||
                (allowOpenParen && prevTokenKind === TypeScript.SyntaxKind.OpenBracketToken)) {
                return;
            } else {
                context.autoCorrectOrError(() => {
                    if (moveToPrevLine && !allowStartOfLine && context.isFirstTokenInLine(token)) {
                        context.autoCorrectText(prevToken, prevToken.text() + " " + token.text());
                        context.autoCorrectText(token, "");
                        context.clearTrailingWhitespace(token);
                    } else {
                        context.clearLeadingWhitespace(token);
                        context.autoCorrectText(token, " " + token.text());
                    }
                }, token, message, code);
            }
        }

        public static errorIfTrailingWhitespace(token: TypeScript.ISyntaxToken, context: RuleContext, message: string, code: string, allowEndOfLine?: boolean): void {
            var trailingWhitespace = context.getTrailingWhitespace(token);
            if (!trailingWhitespace || (allowEndOfLine && context.isLastTokenInLine(token))) {
                return;
            } else {
                context.autoCorrectOrError(() => {
                    context.clearTrailingWhitespace(token);
                }, token, message, code, context.end(token));
            }
        }

        public static errorIfNotTrailingWhitespace(token: TypeScript.ISyntaxToken, context: RuleContext, message: string, code: string, allowEndOfLine: boolean, allowCloseParenOrSemicolon: boolean): void {
            var trailingWhitespace = context.getTrailingWhitespace(token);
            var nextTokenKind = context.getNextToken(token).tokenKind;
            if (trailingWhitespace === " " ||
                (allowEndOfLine && context.isLastTokenInLine(token)) ||
                (allowCloseParenOrSemicolon && nextTokenKind === TypeScript.SyntaxKind.CommaToken) ||
                (allowCloseParenOrSemicolon && nextTokenKind === TypeScript.SyntaxKind.CloseParenToken) ||
                (allowCloseParenOrSemicolon && nextTokenKind === TypeScript.SyntaxKind.CloseBraceToken) ||
                (allowCloseParenOrSemicolon && nextTokenKind === TypeScript.SyntaxKind.CloseBracketToken) ||
                (allowCloseParenOrSemicolon && nextTokenKind === TypeScript.SyntaxKind.SemicolonToken)) {
                return;
            } else {
                context.autoCorrectOrError(() => {
                    context.clearTrailingWhitespace(token);
                    context.autoCorrectText(token, token.text() + " ");
                }, token, message, code, context.end(token));
            }
        }
    }
}