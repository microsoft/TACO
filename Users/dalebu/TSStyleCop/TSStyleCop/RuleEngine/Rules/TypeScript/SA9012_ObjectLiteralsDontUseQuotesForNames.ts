/// <reference path="../RuleHelpers.ts" />

module TSStyleCop.Rules {
    export class ObjectLiteralsDontUseQuotesForNames implements IStyleRule<TypeScript.ObjectLiteralExpressionSyntax> {
        public code: string = "SA9012";
        public name: string = "ObjectLiteralsDontUseQuotesForNames";

        public filter: TypeScript.SyntaxKind[] = [TypeScript.SyntaxKind.ObjectLiteralExpression];

        public checkElement(objectLiteralNode: TypeScript.ObjectLiteralExpressionSyntax, context: RuleContext): void {
            var propertyAssignments: TypeScript.ISyntaxNodeOrToken[] = objectLiteralNode.propertyAssignments.toNonSeparatorArray();

            for (var propertyIndex = 0; propertyIndex < propertyAssignments.length; propertyIndex++) {
                var property = <TypeScript.PropertyAssignmentSyntax>propertyAssignments[propertyIndex];

                if (property.propertyName && property.propertyName.tokenKind === TypeScript.SyntaxKind.StringLiteral) {
                    var propertyText: string = property.propertyName.text();
                    var propertySimpleText: TypeScript.ISimpleText = TypeScript.SimpleText.fromString(propertyText.substring(1, propertyText.length - 1));

                    if (propertySimpleText && TypeScript.Scanner.isValidIdentifier(propertySimpleText, TypeScript.LanguageVersion.EcmaScript5)) {
                        context.reportError(property.propertyName, this.name, this.code);
                    }
                }
            }
        }
    }
}