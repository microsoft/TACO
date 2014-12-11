
/// <reference path="../../IStyleRule.ts" />

module TSStyleCop.Rules {
    export class FunctionsMustHaveTypeAnnotation implements IStyleRule<TypeScript.ISyntaxNode> {
        public code = "SA9002";
        public name = "FunctionsMustHaveTypeAnnotation";

        public filter = [
            TypeScript.SyntaxKind.CallSignature,
            TypeScript.SyntaxKind.GetAccessorPropertyAssignment,
            TypeScript.SyntaxKind.GetMemberAccessorDeclaration];

        public checkElement(node: TypeScript.ISyntaxNode, context: RuleContext): void {
            var parent = context.getParent(node);
            if (!(<any>node).typeAnnotation && (<TypeScript.ISyntaxNode>context.getParent(node)).kind() !== TypeScript.SyntaxKind.ParenthesizedArrowFunctionExpression) {
                context.reportError(node, this.name, this.code, context.end(node));
            }
        }
    }
}