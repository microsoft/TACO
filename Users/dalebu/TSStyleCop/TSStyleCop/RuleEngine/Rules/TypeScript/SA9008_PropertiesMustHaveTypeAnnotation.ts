
/// <reference path="../../IStyleRule.ts" />

module TSStyleCop.Rules {
    export class PropertiesMustHaveTypeAnnotation implements IStyleRule<TypeScript.PropertySignatureSyntax> {
        public code: string = "SA9008";
        public name: string = "PropertiesMustHaveTypeAnnotation";

        public filter: TypeScript.SyntaxKind[] = [TypeScript.SyntaxKind.PropertySignature];

        public checkElement(property: TypeScript.PropertySignatureSyntax, context: RuleContext): void {
            if (!property.typeAnnotation) {
                context.reportError(property, this.name, this.code);
            }
        }
    }
}