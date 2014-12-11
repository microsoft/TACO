using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.IO;

namespace TSStyleCop.Tests
{
    [TestClass]
    public class KnownGoodTests
    {
        private StyleAnalyzer _analyzer;

        [TestInitialize]
        public void Setup()
        {
            this._analyzer = new StyleAnalyzer();
            this._analyzer.Message += OnAnalyzerMessage;
        }

        [TestMethod]
        public void TestGoodFiles()
        {
            string[] files = Directory.GetFiles(@"..\..\TestFiles\GoodFiles", "*.ts", SearchOption.AllDirectories);
            this._analyzer.AnalyzeAll(files);
        }

        private void OnAnalyzerMessage(object sender, StyleMessageEventArgs args)
        {
            Assert.Fail("Known good file failed: {0}({1},{2}) {3}", args.Filename, args.StartLine, args.StartCharacter, args.Message);
        }
    }
}
