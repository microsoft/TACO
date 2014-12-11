
/// <reference path="../../IStyleRule.ts" />

module TSStyleCop.Rules {
    export class CodeMustNotContainMultipleBlankLinesInARow implements IStyleRule<TypeScript.SyntaxTrivia> {
        public code = "SA1507";
        public name = "CodeMustNotContainMultipleBlankLinesInARow";

        public filter = [TypeScript.SyntaxKind.NewLineTrivia];

        public checkElement(trivia: TypeScript.SyntaxTrivia, context: RuleContext): void {
            trivia = trivia.nextTrivia;
            var foundOne = false;
            while (trivia && !trivia.isComment()) {
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