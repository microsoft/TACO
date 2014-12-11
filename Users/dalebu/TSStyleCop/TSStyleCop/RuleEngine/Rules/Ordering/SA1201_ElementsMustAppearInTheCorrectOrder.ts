
/// <reference path="../../IStyleRule.ts" />

module TSStyleCop.Rules {
    interface IOrderState {
        expectedOrder: number;
        element: TypeScript.ISyntaxNode;
        metadata: IElementMetadata;
        index: number;
    }

    interface IElementMetadata {
        visibility: string;
        instance: boolean;
        type: string;
    }

    export class ElementsMustAppearInTheCorrectOrder implements IStyleRule<TypeScript.ClassDeclarationSyntax> {
        private _expectedOrder: IElementMetadata[] = [
            { visibility: "private", instance: false, type: "field" },
            { visibility: "private", instance: true, type: "field" },
            { visibility: "public", instance: false, type: "field" },
            { visibility: "public", instance: true, type: "field" },
            { visibility: "public", instance: true, type: "constructor" },
            { visibility: "public", instance: false, type: "property" },
            { visibility: "public", instance: true, type: "property" },
            { visibility: "private", instance: false, type: "property" },
            { visibility: "private", instance: true, type: "property" },
            { visibility: "public", instance: false, type: "function" },
            { visibility: "public", instance: true, type: "function" },
            { visibility: "private", instance: false, type: "function" },
            { visibility: "private", instance: true, type: "function" }];

        public code: string = "SA1201";
        public name: string = "ElementsMustAppearInTheCorrectOrder";

        public filter: TypeScript.SyntaxKind[] = [TypeScript.SyntaxKind.ClassDeclaration];

        public checkElement(classDeclaration: TypeScript.ClassDeclarationSyntax, context: RuleContext): void {
            var elements = classDeclaration.classElements;
            var currentOrder: IOrderState[] = [];
            var errorString: string;
            var errorElement: TypeScript.ISyntaxNode;
            for (var i = 0; i < elements.childCount(); i++) {
                var element = <TypeScript.ISyntaxNode>elements.childAt(i);
                var metadata = this.getMetadata(element);
                var prev = currentOrder.length && currentOrder[currentOrder.length - 1];
                var expectedOrder = this.getExpectedOrderIndex(metadata);
                currentOrder.push({ expectedOrder: expectedOrder, element: element, metadata: metadata, index: i });
                if (expectedOrder < prev.expectedOrder) {
                    errorString = this.getMetadataString(metadata) + " should be before " + this.getMetadataString(prev.metadata);
                    errorElement = element;
                }
            }

            if (errorElement && errorString) {
                context.autoCorrectOrError(() => {
                    currentOrder.sort((a: IOrderState, b: IOrderState) => {
                        return a.expectedOrder - b.expectedOrder;
                    });
                    var newOrder: number[] = [];
                    for (var i = 0; i < currentOrder.length; i++) {
                        newOrder.push(currentOrder[i].index);
                    }

                    context.autoCorrectOrder(classDeclaration.classElements, newOrder);
                }, errorElement, this.name + " " + errorString, this.code);
            }
        }

        private getMetadataString(metadata: IElementMetadata): string {
            return metadata.visibility + (metadata.instance ? " instance " : " static ") + metadata.type;
        }

        private getMetadata(element: TypeScript.ISyntaxNode): IElementMetadata {
            var visibility = "public";
            var instance = true;
            var type: string = null;

            // Figure out the visibility and whether or not the member is static by examining the modifiers
            var modifiers = (<any>element).modifiers;
            if (modifiers) {
                for (var i = 0; i < modifiers.childCount(); i++) {
                    var modifier = <TypeScript.ISyntaxToken>modifiers.childAt(i);
                    switch (modifier.tokenKind) {
                        case TypeScript.SyntaxKind.PrivateKeyword:
                            visibility = "private";
                            break;
                        case TypeScript.SyntaxKind.PublicKeyword:
                            visibility = "public";
                            break;
                        case TypeScript.SyntaxKind.StaticKeyword:
                            instance = false;
                            break;
                        default:
                            throw new Error("Unknown modifier " + modifier.text());
                    }
                }
            }

            // Figure out the type of the member (field, function, etc)
            switch (element.kind()) {
                case TypeScript.SyntaxKind.MemberVariableDeclaration:
                    type = "field";
                    break;
                case TypeScript.SyntaxKind.GetMemberAccessorDeclaration:
                case TypeScript.SyntaxKind.SetMemberAccessorDeclaration:
                    type = "property";
                    break;
                case TypeScript.SyntaxKind.ConstructorDeclaration:
                    type = "constructor";
                    break;
                case TypeScript.SyntaxKind.MemberFunctionDeclaration:
                    type = "function";
                    break;
                default:
                    throw new Error("Unknown member type " + element.kind());
            }

            return { visibility: visibility, instance: instance, type: type };
        }

        private getExpectedOrderIndex(metadata: IElementMetadata): number {
            for (var i = 0; i < this._expectedOrder.length; i++) {
                var entry = this._expectedOrder[i];
                if (entry.visibility === metadata.visibility && entry.instance === metadata.instance && entry.type === metadata.type) {
                    return i;
                }
            }

            throw new Error("Unable to find expected index");
        }
    }
}