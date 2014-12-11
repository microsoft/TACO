/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />

module TSStyleCop.Rules {
    export class OpeningCurlyBracketsMustNotBeFollowedByBlankLine implements IStyleRule<TypeScript.ISyntaxNode> {
        public code = "SA1505";
        public name = "OpeningCurlyBracketsMustNotBeFollowedByBlankLine";

        public filter = RuleHelpers.BlockNodeTypes.concat(RuleHelpers.ObjectLiteralTypes);

        public checkElement(node: TypeScript.ISyntaxNode, context: RuleContext): void {
            var openBrace = (<any>node).openBraceToken;
            var closeBrace = (<any>node).closeBraceToken;
            var openBraceLine = context.lineMap.getLineNumberFromPosition(context.start(openBrace));
            var closeBraceLine = context.lineMap.getLineNumberFromPosition(context.start(closeBrace));

            if (openBraceLine === closeBraceLine) {
                return;
            }

            if (context.isWhitespaceLine(openBraceLine + 1)) {
                context.autoCorrectOrError(() => {
                    var nextToken = context.getNextToken(openBrace);
                    var trailingWhitespace = context.getTrailingWhitespace(openBrace);
                    var lastLineBreak = Math.min(trailingWhitespace.lastIndexOf("\n"), trailingWhitespace.lastIndexOf("\r"));
                    context.clearTrailingWhitespace(openBrace);
                    context.autoCorrectText(openBrace, openBrace.text() + trailingWhitespace.substr(lastLineBreak));
                }, openBrace, this.name, this.code);
            }
        }
    }
}