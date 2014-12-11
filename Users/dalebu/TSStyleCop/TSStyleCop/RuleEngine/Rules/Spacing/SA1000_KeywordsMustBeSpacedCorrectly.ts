
/// <reference path="../../IStyleRule.ts" />
/// <reference path="SpacingHelpers.ts" />

module TSStyleCop.Rules {
    export class KeywordsMustBeSpacedCorrectly implements IStyleRule<TypeScript.ISyntaxToken> {
        public code = "SA1000";
        public name = "KeywordsMustBeSpacedCorrectly";

        public filter = [
            TypeScript.SyntaxKind.BreakKeyword,
            TypeScript.SyntaxKind.CaseKeyword,
            TypeScript.SyntaxKind.CatchKeyword,
            TypeScript.SyntaxKind.ClassKeyword,
            TypeScript.SyntaxKind.ConstKeyword,
            TypeScript.SyntaxKind.ConstructorKeyword,
            TypeScript.SyntaxKind.ContinueKeyword,
            TypeScript.SyntaxKind.DebuggerKeyword,
            TypeScript.SyntaxKind.DeclareKeyword,
            TypeScript.SyntaxKind.DefaultKeyword,
            TypeScript.SyntaxKind.DeleteKeyword,
            TypeScript.SyntaxKind.DoKeyword,
            TypeScript.SyntaxKind.ElseKeyword,
            TypeScript.SyntaxKind.EnumKeyword,
            TypeScript.SyntaxKind.ExportKeyword,
            TypeScript.SyntaxKind.ExtendsKeyword,
            TypeScript.SyntaxKind.FinallyKeyword,
            TypeScript.SyntaxKind.ForKeyword,
            TypeScript.SyntaxKind.FunctionKeyword,
            TypeScript.SyntaxKind.GetKeyword,
            TypeScript.SyntaxKind.IfKeyword,
            TypeScript.SyntaxKind.ImplementsKeyword,
            TypeScript.SyntaxKind.ImportKeyword,
            TypeScript.SyntaxKind.InKeyword,
            TypeScript.SyntaxKind.InstanceOfKeyword,
            TypeScript.SyntaxKind.InterfaceKeyword,
            TypeScript.SyntaxKind.LetKeyword,
            TypeScript.SyntaxKind.ModuleKeyword,
            TypeScript.SyntaxKind.NewKeyword,
            TypeScript.SyntaxKind.PackageKeyword,
            TypeScript.SyntaxKind.PrivateKeyword,
            TypeScript.SyntaxKind.ProtectedKeyword,
            TypeScript.SyntaxKind.PublicKeyword,
            TypeScript.SyntaxKind.RequireKeyword,
            TypeScript.SyntaxKind.ReturnKeyword,
            TypeScript.SyntaxKind.SetKeyword,
            TypeScript.SyntaxKind.StaticKeyword,
            TypeScript.SyntaxKind.SuperKeyword,
            TypeScript.SyntaxKind.SwitchKeyword,
            TypeScript.SyntaxKind.ThrowKeyword,
            TypeScript.SyntaxKind.TryKeyword,
            TypeScript.SyntaxKind.TypeOfKeyword,
            TypeScript.SyntaxKind.VarKeyword,
            TypeScript.SyntaxKind.WhileKeyword,
            TypeScript.SyntaxKind.WithKeyword];

        public checkElement(keyword: TypeScript.ISyntaxToken, context: RuleContext): void {
            switch (keyword.tokenKind) {
                case TypeScript.SyntaxKind.BreakKeyword:
                case TypeScript.SyntaxKind.ContinueKeyword:
                case TypeScript.SyntaxKind.DefaultKeyword:
                case TypeScript.SyntaxKind.DebuggerKeyword:
                    SpacingHelpers.errorIfTrailingWhitespace(keyword, context, this.name, this.code);
                    break;
                case TypeScript.SyntaxKind.ReturnKeyword:
                case TypeScript.SyntaxKind.ThrowKeyword:
                    var parent = <TypeScript.ISyntaxNode>context.getParent(keyword);
                    if (!(<any>parent).expression) {
                        SpacingHelpers.errorIfTrailingWhitespace(keyword, context, this.name, this.code);
                    } else {
                        SpacingHelpers.errorIfNotTrailingWhitespace(keyword, context, this.name, this.code, false, false);
                    }

                    break;
                case TypeScript.SyntaxKind.ConstructorKeyword:
                case TypeScript.SyntaxKind.SuperKeyword:
                    SpacingHelpers.errorIfTrailingWhitespace(keyword, context, this.name, this.code, false);
                    break;
                case TypeScript.SyntaxKind.ElseKeyword:
                case TypeScript.SyntaxKind.CatchKeyword:
                case TypeScript.SyntaxKind.FinallyKeyword:
                case TypeScript.SyntaxKind.InKeyword:
                case TypeScript.SyntaxKind.InstanceOfKeyword:
                    SpacingHelpers.errorIfNotLeadingWhitespace(keyword, context, this.name, this.code, true, false);
                    SpacingHelpers.errorIfNotTrailingWhitespace(keyword, context, this.name, this.code, false, false);
                    break;
                default:
                    SpacingHelpers.errorIfNotTrailingWhitespace(keyword, context, this.name, this.code, false, false);
                    break;
            }
        }
    }
}