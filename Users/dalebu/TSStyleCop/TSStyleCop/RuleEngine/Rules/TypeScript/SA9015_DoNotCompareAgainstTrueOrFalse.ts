/// <reference path="../RuleHelpers.ts" />

module TSStyleCop.Rules {
    export class DoNotCompareAgainstTrueOrFalse implements IStyleRule<TypeScript.BinaryExpressionSyntax> {
        public code: string = "SA9015";
        public name: string = "DoNotCompareAgainstTrueOrFalse";

        public filter: TypeScript.SyntaxKind[] = RuleHelpers.ComparisonExpressionTypes;

        public checkElement(binaryExpression: TypeScript.BinaryExpressionSyntax, context: RuleContext): void {
            var leftKind = binaryExpression.left.kind();
            var rightKind = binaryExpression.right.kind();

            if (leftKind === TypeScript.SyntaxKind.TrueKeyword || leftKind === TypeScript.SyntaxKind.FalseKeyword ||
                rightKind === TypeScript.SyntaxKind.TrueKeyword || rightKind === TypeScript.SyntaxKind.FalseKeyword) {
                context.reportError(binaryExpression, this.name, this.code);
            }
        }
    }
}