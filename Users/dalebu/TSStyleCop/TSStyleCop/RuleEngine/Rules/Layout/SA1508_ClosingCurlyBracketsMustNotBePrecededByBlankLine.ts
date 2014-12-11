
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />

module TSStyleCop.Rules {
    export class ClosingCurlyBracketsMustNotBePrecededByBlankLine implements IStyleRule<TypeScript.ISyntaxNode> {
        public code = "SA1508";
        public name = "ClosingCurlyBracketsMustNotBePrecededByBlankLine";

        public filter = RuleHelpers.BlockNodeTypes.concat(RuleHelpers.ObjectLiteralTypes);

        public checkElement(node: TypeScript.ISyntaxNode, context: RuleContext): void {
            var openBrace = (<any>node).openBraceToken;
            var closeBrace = (<any>node).closeBraceToken;
            var openBraceLine = context.lineMap.getLineNumberFromPosition(context.start(openBrace));
            var closeBraceLine = context.lineMap.getLineNumberFromPosition(context.start(closeBrace));

            if (openBraceLine === closeBraceLine) {
                return;
            }

            if (context.isWhitespaceLine(closeBraceLine - 1)) {
                context.autoCorrectOrError(() => {
                    var leadingWhitespace = context.getLeadingWhitespace(closeBrace);
                    var lastLineBreak = Math.min(leadingWhitespace.lastIndexOf("\n"), leadingWhitespace.lastIndexOf("\r"));
                    context.clearTrailingWhitespace(context.getPreviousToken(closeBrace));
                    context.autoCorrectText(closeBrace, leadingWhitespace.substr(lastLineBreak) + closeBrace.text());
                }, closeBrace, this.name, this.code);
            }
        }
    }
}