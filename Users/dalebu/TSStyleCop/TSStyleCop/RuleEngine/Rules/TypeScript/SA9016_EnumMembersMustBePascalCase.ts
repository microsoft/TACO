/// <reference path="../RuleHelpers.ts" />

module TSStyleCop.Rules {
    export class EnumMembersMustBePascalCase implements IStyleRule<TypeScript.EnumElementSyntax> {
        public code: string = "SA9016";
        public name: string = "EnumMembersMustBePascalCase";

        public filter: TypeScript.SyntaxKind[] = [TypeScript.SyntaxKind.EnumElement];

        public checkElement(enumMember: TypeScript.EnumElementSyntax, context: RuleContext): void {
            var name: string = enumMember.propertyName.text();

            if (!name.match(/^[A-Z]\d*$|^[A-Z][a-z\d]+(?:[A-Z][a-z\d]+)*$/)) {
                context.reportError(enumMember, this.name, this.code);
            }
        }
    }
}