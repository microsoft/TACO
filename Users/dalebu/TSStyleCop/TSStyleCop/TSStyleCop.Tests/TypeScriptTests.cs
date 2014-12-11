using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.IO;

namespace TSStyleCop.Tests
{
    [TestClass]
    public class TypeScriptTests : BaseRuleTest
    {
        [TestMethod]
        public void TestSA9001()
        {
            this.ExpectError("SA9001", 1, 14);
            this.ExpectError("SA9001", 1, 18);
            this.ExpectError("SA9001", 2, 24);
            this.Analyze(@"TypeScriptFailures\SA9001_Fail.ts");
        }

        [TestMethod]
        public void TestSA9002()
        {
            this.ExpectError("SA9002", 1, 37);
            this.ExpectError("SA9002", 5, 22);
            this.Analyze(@"TypeScriptFailures\SA9002_Fail.ts");
        }

        [TestMethod]
        public void TestSA9003()
        {
            this.ExpectError("SA9003", 2, 13);
            this.ExpectError("SA9003", 7, 13);
            this.ExpectError("SA9003", 7, 16);
            this.Analyze(@"TypeScriptFailures\SA9003_Fail.ts");
        }

        [TestMethod]
        public void TestSA9004()
        {
            this.ExpectError("SA9004", 1, 11);
            this.ExpectError("SA9004", 2, 9);
            this.Analyze(@"TypeScriptFailures\SA9004_Fail.ts");
        }

        [TestMethod]
        public void TestSA9005()
        {
            this.ExpectError("SA9005", 2, 11);
            this.ExpectError("SA9005", 3, 11);
            this.ExpectError("SA9014", 3, 9);
            this.Analyze(@"TypeScriptFailures\SA9005_Fail.ts");
        }

        [TestMethod]
        public void TestSA9006()
        {
            this.ExpectError("SA9006", 2, 2);
            this.ExpectError("SA9006", 4, 10);
            this.ExpectError("SA9006", 6, 29);
            this.ExpectError("SA9006", 6, 31);
            this.Analyze(@"TypeScriptFailures\SA9006_Fail.ts");
        }

        [TestMethod]
        public void TestSA9008()
        {
            this.ExpectError("SA9008", 1, 12);
            this.ExpectError("SA9008", 1, 15);
            this.Analyze(@"TypeScriptFailures\SA9008_Fail.ts");
        }

        [TestMethod]
        public void TestSA9009()
        {
            this.ExpectError("SA9009", 3, 13);
            this.ExpectError("SA9009", 4, 13);
            this.ExpectError("SA1301", 4, 13);
            this.Analyze(@"TypeScriptFailures\SA9009_Fail.ts");
        }

        [TestMethod]
        public void TestSA9010()
        {
            this.ExpectError("SA9010", 2, 5);
            this.Analyze(@"TypeScriptFailures\SA9010_Fail.ts");
        }

        [TestMethod]
        public void TestSA9011()
        {
            this.ExpectError("SA9011", 4, 5);
            this.ExpectError("SA1003", 5, 11);
            this.ExpectError("SA1003", 10, 21);
            this.ExpectError("SA1003", 14, 16);
            this.ExpectError("SA9011", 17, 13);
            this.ExpectError("SA9011", 19, 13);
            this.ExpectError("SA9011", 24, 13);
            this.ExpectError("SA1012", 24, 13);
            this.ExpectError("SA9011", 24, 39);
            this.Analyze(@"TypeScriptFailures\SA9011_Fail.ts");
        }

        [TestMethod]
        public void TestSA9012()
        {
            this.ExpectError("SA9012", 2, 5);
            this.ExpectError("SA9012", 5, 5);
            this.ExpectError("SA9012", 7, 9);
            this.Analyze(@"TypeScriptFailures\SA9012_Fail.ts");
        }

        [TestMethod]
        public void TestSA9013()
        {
            this.ExpectError("SA9013", 4, 5);
            this.ExpectError("SA9013", 13, 5);
            this.Analyze(@"TypeScriptFailures\SA9013_Fail.ts");
        }

        [TestMethod]
        public void TestSA9014()
        {
            this.ExpectError("SA9014", 2, 9);
            this.ExpectError("SA9014", 4, 8);
            this.ExpectError("SA9005", 4, 12);
            this.ExpectError("SA9014", 8, 13);
            this.ExpectError("SA9014", 11, 18);
            this.ExpectError("SA9005", 11, 22);
            this.ExpectError("SA9014", 13, 35);
            this.ExpectError("SA9005", 13, 39);
            this.Analyze(@"TypeScriptFailures\SA9014_Fail.ts");
        }

        [TestMethod]
        public void TestSA9015()
        {
            this.ExpectError("SA9015", 2, 9);
            this.ExpectError("SA9015", 4, 8);
            this.ExpectError("SA9005", 4, 12);
            this.ExpectError("SA9015", 8, 13);
            this.ExpectError("SA9015", 11, 18);
            this.ExpectError("SA9005", 11, 22);
            this.ExpectError("SA9015", 13, 35);
            this.ExpectError("SA9005", 13, 39);
            this.Analyze(@"TypeScriptFailures\SA9015_Fail.ts");
        }

        [TestMethod]
        public void TestSA9016()
        {
            this.ExpectError("SA9016", 2, 5);
            this.ExpectError("SA9016", 3, 5);
            this.ExpectError("SA9016", 5, 5);
            this.ExpectError("SA9016", 7, 5);
            this.Analyze(@"TypeScriptFailures\SA9016_Fail.ts");
        }

        [TestMethod]
        public void TestSA9017()
        {
            this.ExpectError("SA9017", 1, 9);
            this.ExpectError("SA9017", 3, 12);
            this.ExpectError("SA9017", 7, 35);
            this.ExpectError("SA9017", 8, 17);
            this.ExpectError("SA9017", 10, 19);
            this.ExpectError("SA9017", 13, 28);
            this.Analyze(@"TypeScriptFailures\SA9017_Fail.ts");
        }
    }
}
