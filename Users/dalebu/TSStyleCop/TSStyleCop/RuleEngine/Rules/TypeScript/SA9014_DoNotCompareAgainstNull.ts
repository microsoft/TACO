/// <reference path="../RuleHelpers.ts" />

module TSStyleCop.Rules {
    export class DoNotCompareAgainstNull implements IStyleRule<TypeScript.BinaryExpressionSyntax> {
        public code: string = "SA9014";
        public name: string = "DoNotCompareAgainstNull";

        public filter: TypeScript.SyntaxKind[] = RuleHelpers.ComparisonExpressionTypes;

        public checkElement(binaryExpression: TypeScript.BinaryExpressionSyntax, context: RuleContext): void {
            if (binaryExpression.left.kind() === TypeScript.SyntaxKind.NullKeyword || binaryExpression.right.kind() === TypeScript.SyntaxKind.NullKeyword) {
                context.reportError(binaryExpression, this.name, this.code);
            }
        }
    }
}