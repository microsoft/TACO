
/// <reference path="../../IStyleRule.ts" />
/// <reference path="../../Utils.ts" />

module TSStyleCop.Rules {
    export class AccessModifierMustBeDeclared implements IStyleRule<TypeScript.ClassDeclarationSyntax> {
        public code: string = "SA1400";
        public name: string = "AccessModifierMustBeDeclared";

        public filter: TypeScript.SyntaxKind[] = [TypeScript.SyntaxKind.ClassDeclaration];

        public checkElement(classNode: TypeScript.ClassDeclarationSyntax, context: RuleContext): void {
            var elements = classNode.classElements;
            for (var i = 0; i < elements.childCount(); i++) {
                var element = <TypeScript.MemberFunctionDeclarationSyntax>elements.childAt(i);
                if (element.kind() !== TypeScript.SyntaxKind.ConstructorDeclaration) {
                    if (!element.modifiers || element.modifiers.childCount() === 0) {
                        context.reportError(element, this.name, this.code);
                    } else {
                        var foundAccessModifier = false;
                        for (var j = 0; j < element.modifiers.childCount(); j++) {
                            var modifier = <TypeScript.ISyntaxToken>element.modifiers.childAt(j);
                            switch (modifier.tokenKind) {
                                case TypeScript.SyntaxKind.PublicKeyword:
                                case TypeScript.SyntaxKind.ProtectedKeyword:
                                case TypeScript.SyntaxKind.PrivateKeyword:
                                    foundAccessModifier = true;
                                    break;
                                case TypeScript.SyntaxKind.StaticKeyword:
                                case TypeScript.SyntaxKind.DeclareKeyword:
                                    break;
                                default:
                                    throw "Unexpected";
                            }
                        }

                        if (!foundAccessModifier) {
                            context.reportError(element, this.name, this.code);
                        }
                    }
                }
            }
        }
    }
}