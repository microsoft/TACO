/// <reference path="../RuleHelpers.ts" />

module TSStyleCop.Rules {
    export class ElementMustBeginWithUpperCaseLetter implements IStyleRule<TypeScript.ISyntaxNode> {
        public code: string = "SA1300";
        public name: string = "ElementMustBeginWithUpperCaseLetter";

        public filter: TypeScript.SyntaxKind[] = [TypeScript.SyntaxKind.ClassDeclaration, TypeScript.SyntaxKind.EnumDeclaration,
            TypeScript.SyntaxKind.InterfaceDeclaration, TypeScript.SyntaxKind.MemberVariableDeclaration];

        public checkElement(element: TypeScript.ISyntaxNode, context: RuleContext): void {
            var nameToken: TypeScript.ISyntaxToken;

            if (element.kind() === TypeScript.SyntaxKind.MemberVariableDeclaration) {
                var member = <TypeScript.MemberVariableDeclarationSyntax>element;
                var modifiers = member.modifiers;

                if (RuleHelpers.listContains(modifiers, TypeScript.SyntaxKind.StaticKeyword)) {
                    nameToken = member.variableDeclarator.identifier;
                }
            } else {
                // classes, enums, and interfaces all have identifier properties
                nameToken = (<any>element).identifier;
            }

            if (nameToken) {
                var name = nameToken.text();

                if (!name.match(/^[A-Z]/)) {
                    context.reportError(nameToken, this.name, this.code);
                }
            }
        }
    }
}