
/// <reference path="../../IStyleRule.ts" />

module TSStyleCop.Rules {
    export class ParametersMustHaveTypeAnnotation implements IStyleRule<TypeScript.ISyntaxNode> {
        public code = "SA9001";
        public name = "ParametersMustHaveTypeAnnotation";

        public filter = [TypeScript.SyntaxKind.Parameter, TypeScript.SyntaxKind.IndexSignature];

        public checkElement(parameter: TypeScript.ISyntaxNode, context: RuleContext): void {
            if (!(<any>parameter).typeAnnotation) {
                context.reportError(parameter, this.name, this.code);
            }
        }
    }
}