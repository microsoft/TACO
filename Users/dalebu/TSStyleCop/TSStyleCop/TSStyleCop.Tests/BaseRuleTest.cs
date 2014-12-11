using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace TSStyleCop.Tests
{
    public abstract class BaseRuleTest
    {
        private StyleAnalyzer _analyzer;
        private List<ExpectedError> _expectedErrors;
        private List<StyleMessageEventArgs> _messages;

        protected BaseRuleTest()
        {
            this._analyzer = new StyleAnalyzer();
            this._analyzer.Message += OnAnalyzerMessage;
        }

        [TestInitialize]
        public void Setup()
        {
            this._expectedErrors = new List<ExpectedError>();
            this._messages = new List<StyleMessageEventArgs>();
        }

        [TestCleanup]
        public void Complete()
        {
            foreach (StyleMessageEventArgs message in this._messages)
            {
                this.ProcessMessage(message);
            }
            foreach (ExpectedError error in this._expectedErrors)
            {
                Assert.Fail("Expected error {0} at {1},{2} but it wasn't found", error.Code, error.Line, error.Column);
            }
        }

        protected void ExpectError(string code, int line, int column)
        {
            this._expectedErrors.Add(new ExpectedError(code, line, column));
        }

        protected void Analyze(string filename)
        {
            this._analyzer.AnalyzeAll(new string[] { @"..\..\TestFiles\" + filename });
        }

        private void OnAnalyzerMessage(object sender, StyleMessageEventArgs args)
        {
            this._messages.Add(args);
        }

        private void ProcessMessage(StyleMessageEventArgs args)
        {
            for (int i = this._expectedErrors.Count - 1; i >= 0; i--)
            {
                ExpectedError error = this._expectedErrors[i];
                if (error.Code == args.Code && error.Line == args.StartLine && error.Column == args.StartCharacter)
                {
                    this._expectedErrors.RemoveAt(i);
                    return;
                }
            }
            Assert.Fail("Unexpected style error {0} at {1}({2},{3})", args.Message, args.Filename, args.StartLine, args.StartCharacter);
        }

        private class ExpectedError
        {
            public ExpectedError(string code, int line, int column)
            {
                this.Code = code;
                this.Line = line;
                this.Column = column;
            }

            public string Code { get; private set; }

            public int Line { get; private set; }

            public int Column { get; private set; }
        }
    }
}
