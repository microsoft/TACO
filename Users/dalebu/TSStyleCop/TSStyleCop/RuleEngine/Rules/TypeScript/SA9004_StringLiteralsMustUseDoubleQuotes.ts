
/// <reference path="../../IStyleRule.ts" />

module TSStyleCop.Rules {
    export class StringLiteralsMustUseDoubleQuotes implements IStyleRule<TypeScript.ISyntaxToken> {
        public code = "SA9004";
        public name = "StringLiteralsMustUseDoubleQuotes";

        public filter = [TypeScript.SyntaxKind.StringLiteral];

        public checkElement(stringToken: TypeScript.ISyntaxToken, context: RuleContext): void {
            var text = stringToken.text();
            if (text.charAt(0) !== "\"") {
                context.autoCorrectOrError(() => {
                    context.autoCorrectText(stringToken, "\"" + text.substr(1, text.length - 2).replace(/\"/g, "\\\"") + "\"");
                }, stringToken, this.name, this.code);
            }
        }
    }
}