/// <reference path="../RuleHelpers.ts" />

module TSStyleCop.Rules {
    export class DoNotUseParameterPropertyDeclarations implements IStyleRule<TypeScript.ConstructorDeclarationSyntax> {
        public code: string = "SA9013";
        public name: string = "DoNotUseParameterPropertyDeclarations";

        public filter: TypeScript.SyntaxKind[] = [TypeScript.SyntaxKind.ConstructorDeclaration];

        public checkElement(constructorDeclaration: TypeScript.ConstructorDeclarationSyntax, context: RuleContext): void {
            var parameterList: TypeScript.ParameterListSyntax = constructorDeclaration.parameterList;
            var containsParameterPropertyDeclaration = false;

            if (parameterList && parameterList.parameters) {
                var parameters: TypeScript.ISeparatedSyntaxList = parameterList.parameters;

                for (var parameterIndex = 0; parameterIndex < parameters.childCount(); parameterIndex++) {
                    var parameter: TypeScript.ISyntaxNodeOrToken = parameters.childAt(parameterIndex);

                    if (parameter.kind() === TypeScript.SyntaxKind.Parameter && (<TypeScript.ParameterSyntax>parameter).publicOrPrivateKeyword) {
                        containsParameterPropertyDeclaration = true;
                        break;
                    }
                }

                if (containsParameterPropertyDeclaration) {
                    context.reportError(constructorDeclaration, this.name, this.code);
                }
            }
        }
    }
}