
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />

module TSStyleCop.Rules {
    export class DocumentationCommentsMustBeginWithStarSingleSpace implements IStyleRule<TypeScript.SyntaxTrivia> {
        public code = "SA1004";
        public name = "JSDocMustBeFormattedCorrectly";

        public filter = [TypeScript.SyntaxKind.MultiLineCommentTrivia];

        public checkElement(comment: TypeScript.SyntaxTrivia, context: RuleContext, position?: number): void {
            var text = comment.fullText();
            var errorPosition = -1;

            if (text.substr(0, 3) === "/**") {
                var indent = " ";
                var prevTriva = comment.prevTrivia;
                if (prevTriva && prevTriva.isWhitespace()) {
                    indent = prevTriva.fullText() + " ";
                }

                var commentLines = text.split("\n");
                if (commentLines.length === 1) {
                    // Ensure a single line comment looks like: /** Content */
                    if (!text.match(/^\s*\/\*\* \S.* \*\/\r?$/)) {
                        errorPosition = position;
                        commentLines[0] = "/** " + commentLines[0].substr(3, commentLines[0].length - 5).trim() + " */";
                    }
                } else {
                    for (var i = 0; i < commentLines.length; i++) {
                        var line = commentLines[i];
                        var originalLength = line.length;
                        if (i === 0) {
                            if (!line.match(/^\/\*\*\r?$/)) {
                                errorPosition = position + 3;
                                var remainder = line.substr(3).trim();
                                if (remainder.length) {
                                    commentLines.splice(1, 0, indent + "* " + remainder);
                                }

                                line = "/**";
                            }
                        } else {
                            // Ensure all lines are indented correctly
                            var lineIndent = line.substr(0, indent.length);
                            if (lineIndent !== indent) {
                                errorPosition = position + indent.length;
                                if (lineIndent.match(/^\s*$/)) {
                                    line = indent + line.substr(lineIndent.length);
                                } else {
                                    line = indent + line.replace(/^\s*/, "");
                                }
                            }

                            var afterIndent = line.substr(indent.length);
                            if (i === commentLines.length - 1) {
                                if (!afterIndent.match(/^\*\/\r?$/)) {
                                    errorPosition = position + line.length - 2;
                                    var beforeEnd = afterIndent.substr(0, afterIndent.length - 2).trim();
                                    if (beforeEnd.length) {
                                        line = indent + beforeEnd;
                                        commentLines.push(indent + "*/");
                                    } else {
                                        line = indent + "*/";
                                    }
                                }
                            } else {
                                if (!afterIndent.match(/(^\* \s*\S)|(^\*)/)) {
                                    errorPosition = position + indent.length;
                                    var indexOfStar = afterIndent.indexOf("*");
                                    if (indexOfStar >= 0) {
                                        afterIndent = afterIndent.substr(indexOfStar + 1);
                                        afterIndent = afterIndent.replace(/^\s/, "");
                                    }

                                    afterIndent = afterIndent.replace(/\s*$/, "");
                                    line = indent + "* " + afterIndent;
                                }
                            }
                        }

                        position += originalLength + 1;
                        commentLines[i] = line;
                    }
                }

                if (errorPosition >= 0) {
                    var newText = commentLines.join("\n");
                    if (newText !== text) {
                        context.autoCorrectOrError(() => {
                            context.autoCorrectText(comment, newText);
                        }, null, this.name, this.code, errorPosition, 0);
                    } else {
                        context.reportError(null, this.name, this.code, errorPosition, 0);
                    }
                }
            }
        }
    }
}