
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />
/// <reference path="../Documentation/DocumentationHelpers.ts" />

module TSStyleCop.Rules {
    export class DoNotUseXmlDocs implements IStyleRule<TypeScript.SyntaxTrivia> {
        public code = "SA9010";
        public name = "DoNotUseXmlDocs";

        public filter = [TypeScript.SyntaxKind.SingleLineCommentTrivia];

        public checkElement(comment: TypeScript.SyntaxTrivia, context: RuleContext, position?: number): void {
            if (DocumentationHelpers.isXmlDoc(comment)) {
                context.autoCorrectOrError(() => {
                    var documentation = DocumentationHelpers.parseXmlDoc(comment);
                    var token = comment.token;
                    
                    // Find a token before the comment
                    while (context.start(token) > position) {
                        token = context.getPreviousToken(token);
                    }

                    // Scan to the beginning of the line
                    var line = context.lineMap.getLineNumberFromPosition(context.start(token));
                    var prevToken = context.getPreviousToken(token);
                    while (prevToken && context.lineMap.getLineNumberFromPosition(context.start(prevToken)) === line) {
                        token = prevToken;
                        prevToken = context.getPreviousToken(token);
                    }

                    // Clear out the old comments
                    while (comment) {
                        if (comment.kind() === TypeScript.SyntaxKind.SingleLineCommentTrivia) {
                            if (comment.fullText().match(/^\/\/\/\s*(.*)$/)) {
                                context.autoCorrectText(comment, "");
                            } else {
                                // Stop removing if we hit a non-xmldoc single line comment
                                break;
                            }
                        } else if (comment.kind() === TypeScript.SyntaxKind.MultiLineCommentTrivia) {
                            // Stop removing if we hit a multi-line comment
                            break;
                        } else {
                            // Clear whitespace and newlines between comment lines
                            context.autoCorrectText(comment, "");
                        }

                        comment = comment.nextTrivia;
                    }

                    var triviaToAddTo = <TypeScript.SyntaxTrivia[]><any>token.leadingTrivia();
                    var column = context.lineMap.getLineAndCharacterFromPosition(context.start(token)).character();
                    triviaToAddTo.push(DocumentationHelpers.createJSDoc(documentation, column));
                    triviaToAddTo.push(<any>TypeScript.Syntax.trivia(TypeScript.SyntaxKind.WhitespaceTrivia, RuleHelpers.spaceString(column)));
                }, null, this.name, this.code, position);
            }
        }
    }
}