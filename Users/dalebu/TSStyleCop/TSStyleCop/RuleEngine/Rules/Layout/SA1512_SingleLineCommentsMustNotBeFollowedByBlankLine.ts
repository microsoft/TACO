
/// <reference path="../../IStyleRule.ts" />

module TSStyleCop.Rules {
    export class SingleLineCommentsMustNotBeFollowedByBlankLine implements IStyleRule<TypeScript.SyntaxTrivia> {
        public code = "SA1512";
        public name = "SingleLineCommentsMustNotBeFollowedByBlankLine";

        public filter = [TypeScript.SyntaxKind.SingleLineCommentTrivia];

        public checkElement(comment: TypeScript.SyntaxTrivia, context: RuleContext, position?: number): void {
            var text = comment.fullText();
            if (text.length > 2 && text.substr(0, 2) === "//" && text.charAt(2) !== "/") {
                // First make sure the comment starts the line by finding a previous new line trivia
                var trivia = comment.prevTrivia;
                var startsLine = false;
                while (trivia && !trivia.isComment()) {
                    if (trivia.isNewLine()) {
                        startsLine = true;
                        break;
                    }

                    trivia = trivia.prevTrivia;
                }

                trivia = comment.nextTrivia;
                var foundOne = false;
                while (startsLine && trivia && !trivia.isComment()) {
                    if (trivia.isNewLine()) {
                        if (foundOne) {
                            context.autoCorrectOrError(() => {
                                context.autoCorrectText(trivia, "");
                            }, null, this.name, this.code, context.start(trivia), 0);
                        }

                        foundOne = true;
                    }

                    trivia = trivia.nextTrivia;
                }
            }
        }
    }
}