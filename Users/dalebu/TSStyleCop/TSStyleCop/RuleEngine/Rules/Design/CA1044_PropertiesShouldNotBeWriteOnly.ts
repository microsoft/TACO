/// <reference path="../RuleHelpers.ts" />

module TSStyleCop.Rules {
    export class PropertiesShouldNotBeWriteOnly implements IStyleRule<TypeScript.ClassDeclarationSyntax> {
        public code: string = "CA1044";
        public name: string = "PropertiesShouldNotBeWriteOnly";

        public filter: TypeScript.SyntaxKind[] = [TypeScript.SyntaxKind.ClassDeclaration];

        // The assumption of this rule is that the set and get accessors must be lexically declared in the same class. This means
        // the rule will report false positives if the get and set for a given property are declared in base/derived classes. Handling that
        // case would be very difficult syntactically, and I doubt we have any instances of it in our code anyway (we'll find out when this rule
        // is turned on for the rest of the code base). This rule will not prevent set only properites defined through Object.defineProperty(ies),
        // or defined in object literals.
        public checkElement(classDeclaration: TypeScript.ClassDeclarationSyntax, context: RuleContext): void {
            if (!classDeclaration.classElements) {
                return;
            }

            var properties: { [name: string]: { hasGet: boolean; setAccessorElement: TypeScript.ISyntaxElement; } } = {};
            var classElements: TypeScript.ISyntaxNodeOrToken[] = classDeclaration.classElements.toArray();

            for (var elementIndex = 0; elementIndex < classElements.length; elementIndex++) {
                var classElement: TypeScript.ISyntaxNodeOrToken = classElements[elementIndex];
                var classElementKind: TypeScript.SyntaxKind = classElement.kind();
                var propertyName: string;

                if (classElementKind === TypeScript.SyntaxKind.GetMemberAccessorDeclaration) {
                    propertyName = (<TypeScript.GetMemberAccessorDeclarationSyntax>classElement).propertyName.text();

                    if (propertyName) {
                        if (properties[propertyName]) {
                            properties[propertyName].hasGet = true;
                        } else {
                            properties[propertyName] = { hasGet: true, setAccessorElement: null };
                        }
                    }
                } else if (classElementKind === TypeScript.SyntaxKind.SetMemberAccessorDeclaration) {
                    propertyName = (<TypeScript.SetMemberAccessorDeclarationSyntax>classElement).propertyName.text();

                    if (propertyName) {
                        if (properties[propertyName]) {
                            properties[propertyName].setAccessorElement = classElement;
                        } else {
                            properties[propertyName] = { hasGet: false, setAccessorElement: classElement };
                        }
                    }
                }
            }

            for (var name in properties) {
                if (properties[name].setAccessorElement && !properties[name].hasGet) {
                    context.reportError(properties[name].setAccessorElement, this.name, this.code);
                }
            }
        }
    }
}