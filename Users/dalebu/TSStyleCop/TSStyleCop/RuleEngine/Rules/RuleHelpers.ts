
/// <reference path="../IStyleRule.ts" />

module TSStyleCop.Rules {
    export class RuleHelpers {
        /**
         * All these items have .openBraceToken and .closeBraceToken and contain code
         */
        public static BlockNodeTypes = [
            TypeScript.SyntaxKind.Block,
            TypeScript.SyntaxKind.ModuleDeclaration,
            TypeScript.SyntaxKind.ClassDeclaration,
            TypeScript.SyntaxKind.EnumDeclaration,
            TypeScript.SyntaxKind.SwitchStatement];

        /** These can all be typed as TypeScript.BinaryExpressionSyntax */
        public static ComparisonExpressionTypes = [
            TypeScript.SyntaxKind.EqualsExpression,
            TypeScript.SyntaxKind.EqualsWithTypeConversionExpression,
            TypeScript.SyntaxKind.NotEqualsExpression,
            TypeScript.SyntaxKind.NotEqualsWithTypeConversionExpression
        ];

        /**
         * These also have .openBraceToken and .closeBraceToken and are object-literal-like
         */
        public static ObjectLiteralTypes = [
            TypeScript.SyntaxKind.ObjectLiteralExpression,
            TypeScript.SyntaxKind.ObjectType];

        public static getBlockContents(node: TypeScript.ISyntaxNode): TypeScript.ISyntaxElement {
            return node["statements"] ||        // Block
                node["propertyAssignments"] ||  // ObjectLiteral
                node["typeMembers"] ||          // ObjectType
                node["moduleElements"] ||       // ModuleDeclaration
                node["classElements"] ||        // ClassDeclaration
                node["enumElements"] ||         // EnumDeclaration
                node["switchClauses"];          // SwitchStatement
        }

        public static getIndent(character: number): number {
            return character / 4;
        }

        public static spaceString(count: number): string {
            var result = "";
            for (var i = 0; i < count; i++) {
                result += " ";
            }

            return result;
        }

        public static createIndent(count: number): string {
            return RuleHelpers.spaceString(count * 4);
        }

        public static listContains(list: TypeScript.ISyntaxElement, kind: TypeScript.SyntaxKind): boolean {
            for (var i = 0; i < list.childCount(); i++) {
                var element = list.childAt(i);
                var elementKind: TypeScript.SyntaxKind;
                if (element.isNode()) {
                    elementKind = (<TypeScript.ISyntaxNode>element).kind();
                } else if (element.isToken()) {
                    elementKind = (<TypeScript.ISyntaxToken>element).tokenKind;
                }

                if (elementKind === kind) {
                    return true;
                }
            }

            return false;
        }
    }
}