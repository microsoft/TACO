
/// <reference path="../../IStyleRule.ts" />

module TSStyleCop.Rules {
    export class CurlyBracketsMustNotBeOmitted implements IStyleRule<TypeScript.ISyntaxNode> {
        public code = "SA1503";
        public name = "CurlyBracketsMustNotBeOmitted";

        public filter = [
            TypeScript.SyntaxKind.IfStatement,
            TypeScript.SyntaxKind.ElseClause,
            TypeScript.SyntaxKind.DoStatement,
            TypeScript.SyntaxKind.ForInStatement,
            TypeScript.SyntaxKind.ForStatement,
            TypeScript.SyntaxKind.WhileStatement
            ];

        public checkElement(syntaxNode: TypeScript.ISyntaxNode, context: RuleContext): void {
            var node = <any>syntaxNode;
            if (node.kind() === TypeScript.SyntaxKind.ElseClause && node.statement && node.statement.kind() === TypeScript.SyntaxKind.IfStatement) {
                return;
            }

            if (node.statement && node.statement.kind() !== TypeScript.SyntaxKind.Block) {
                context.reportError(node.statement, this.name, this.code);
            }
        }
    }
}