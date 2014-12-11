
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../RuleHelpers.ts" />

module TSStyleCop.Rules {
    export class PrivateFieldsMustBeginWithUnderscore implements IStyleRule<TypeScript.MemberVariableDeclarationSyntax> {
        public code: string = "SA9009";
        public name: string = "PrivateFieldsMustBeginWithUnderscore";

        public filter: TypeScript.SyntaxKind[] = [TypeScript.SyntaxKind.MemberVariableDeclaration];

        public checkElement(node: TypeScript.MemberVariableDeclarationSyntax, context: RuleContext): void {
            var modifiers = node.modifiers;
            if (RuleHelpers.listContains(modifiers, TypeScript.SyntaxKind.PrivateKeyword) &&
                !RuleHelpers.listContains(modifiers, TypeScript.SyntaxKind.StaticKeyword)) {
                var nameToken = node.variableDeclarator.identifier;
                var name = nameToken.text();
                if (name.charAt(0) !== "_") {
                    context.reportError(nameToken, this.name, this.code);
                }
            }
        }
    }
}