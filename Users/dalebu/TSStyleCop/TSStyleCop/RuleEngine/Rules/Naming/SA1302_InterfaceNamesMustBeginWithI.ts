
/// <reference path="../../IStyleRule.ts" />

module TSStyleCop.Rules {
    export class InterfaceNamesMustBeginWithI implements IStyleRule<TypeScript.InterfaceDeclarationSyntax> {
        public code: string = "SA1302";
        public name: string = "InterfaceNamesMustBeginWithI";

        public filter: TypeScript.SyntaxKind[] = [TypeScript.SyntaxKind.InterfaceDeclaration];

        public checkElement(node: TypeScript.InterfaceDeclarationSyntax, context: RuleContext): void {
            var nameToken = node.identifier;
            var name = nameToken.text();
            if (name.charAt(0) !== "I") {
                context.reportError(nameToken, this.name, this.code);
            }
        }
    }
}