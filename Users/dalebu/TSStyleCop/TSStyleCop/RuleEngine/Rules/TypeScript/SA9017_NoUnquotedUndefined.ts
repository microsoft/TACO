/// <reference path="../RuleHelpers.ts" />

module TSStyleCop.Rules {
    export class NoUnquotedUndefined implements IStyleRule<TypeScript.ISyntaxToken> {
        public code: string = "SA9017";
        public name: string = "NoUnquotedUndefined";

        public filter: TypeScript.SyntaxKind[] = [TypeScript.SyntaxKind.IdentifierName];

        // This rule is expensive since it checks every identifier in the file
        public checkElement(identifier: TypeScript.ISyntaxToken, context: RuleContext): void {
            var text: string = identifier.text();

            if (text === "undefined") {
                context.reportError(identifier, this.name, this.code);
            }
        }
    }
}