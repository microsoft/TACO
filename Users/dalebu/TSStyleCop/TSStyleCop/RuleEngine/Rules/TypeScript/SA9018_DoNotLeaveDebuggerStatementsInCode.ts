/// <reference path="../../IStyleRule.ts" />

module TSStyleCop.Rules {
    export class DoNotLeaveDebuggerStatementsInCode implements IStyleRule<TypeScript.ISyntaxToken> {
        public code = "SA9018";
        public name = "DoNotLeaveDebuggerStatementsInCode";

        public filter = [TypeScript.SyntaxKind.DebuggerKeyword];

        public checkElement(identifier: TypeScript.ISyntaxToken, context: RuleContext): void {
            context.reportError(identifier, this.name, this.code);
        }
    }
}