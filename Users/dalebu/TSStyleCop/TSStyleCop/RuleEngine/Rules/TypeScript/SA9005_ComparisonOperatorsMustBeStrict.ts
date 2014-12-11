
/// <reference path="../../IStyleRule.ts" />

module TSStyleCop.Rules {
    export class ComparisonOperatorsMustBeStrict implements IStyleRule<TypeScript.ISyntaxToken> {
        public code = "SA9005";
        public name = "ComparisonOperatorsMustBeStrict";

        public filter = [TypeScript.SyntaxKind.EqualsEqualsToken, TypeScript.SyntaxKind.ExclamationEqualsToken];

        public checkElement(token: TypeScript.ISyntaxToken, context: RuleContext): void {
            context.reportError(token, this.name, this.code);
        }
    }
}