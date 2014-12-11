
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />

module TSStyleCop.Rules {
    export class ElementMustBeginWithLowerCaseLetter implements IStyleRule<TypeScript.ISyntaxNode> {
        public code: string = "SA1301";
        public name: string = "ElementMustBeginWithLowerCaseLetter";

        public filter: TypeScript.SyntaxKind[] = [TypeScript.SyntaxKind.MemberFunctionDeclaration,
            TypeScript.SyntaxKind.GetMemberAccessorDeclaration,
            TypeScript.SyntaxKind.SetMemberAccessorDeclaration,
            TypeScript.SyntaxKind.VariableDeclarator,
            TypeScript.SyntaxKind.Parameter];

        public checkElement(member: TypeScript.ISyntaxNode, context: RuleContext): void {
            // Ignore static fields as they are covered by a separate rule (and aren't camel case)
            if (member.kind() === TypeScript.SyntaxKind.VariableDeclarator) {
                var parent = context.getParent(member);
                if (parent && parent.kind() === TypeScript.SyntaxKind.MemberVariableDeclaration &&
                    RuleHelpers.listContains((<TypeScript.MemberVariableDeclarationSyntax>parent).modifiers, TypeScript.SyntaxKind.StaticKeyword)) {
                    return;
                }
            }

            var nameToken = (<TypeScript.MemberAccessorDeclarationSyntax>member).propertyName || (<TypeScript.VariableDeclaratorSyntax>member).identifier;
            var name: string = nameToken.text();

            if (!name.match(/^_?[a-z]/)) {
                context.reportError(nameToken, this.name, this.code);
            }
        }
    }
}