
/// <reference path="../../IStyleRule.ts" />

module TSStyleCop.Rules {
    export class UnassignedVariablesMustHaveTypeAnnotation implements IStyleRule<TypeScript.VariableDeclaratorSyntax> {
        public code: string = "SA9003";
        public name: string = "UnassignedVariablesMustHaveTypeAnnotation";

        public filter: TypeScript.SyntaxKind[] = [TypeScript.SyntaxKind.VariableDeclarator];

        public checkElement(variable: TypeScript.VariableDeclaratorSyntax, context: RuleContext): void {
            var grandParentElement = context.getParent(context.getParent(variable));
            if (grandParentElement.isNode() && (<TypeScript.ISyntaxNode>grandParentElement).kind() === TypeScript.SyntaxKind.ForInStatement) {
                // for (var key in obj) doesn't need a type annotation for key
                return;
            }

            if (!variable.typeAnnotation && !variable.equalsValueClause) {
                context.reportError(variable, this.name, this.code);
            }
        }
    }
}