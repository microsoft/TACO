using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.IO;

namespace TSStyleCop.Tests
{
    [TestClass]
    public class SpacingTests : BaseRuleTest
    {
        [TestMethod]
        public void TestSA1000()
        {
            this.ExpectError("SA1000", 3, 16);
            this.ExpectError("SA1008", 3, 17);
            this.ExpectError("SA1000", 4, 11);
            this.ExpectError("SA1000", 5, 16);
            this.ExpectError("SA1000", 5, 27);
            this.ExpectError("SA1000", 6, 19);
            this.ExpectError("SA1000", 6, 33);
            this.ExpectError("SA1000", 6, 43);
            this.ExpectError("SA1000", 10, 19);
            this.ExpectError("SA1000", 11, 29);
            this.Analyze(@"SpacingFailures\SA1000_Fail.ts");
        }

        [TestMethod]
        public void TestSA1001()
        {
            this.ExpectError("SA1001", 1, 16);
            this.ExpectError("SA1001", 1, 20);
            this.ExpectError("SA1001", 4, 5);
            this.Analyze(@"SpacingFailures\SA1001_Fail.ts");
        }

        [TestMethod]
        public void TestSA1002()
        {
            this.ExpectError("SA1002", 1, 16);
            this.ExpectError("SA1002", 1, 26);
            this.ExpectError("SA1002", 2, 21);
            this.Analyze(@"SpacingFailures\SA1002_Fail.ts");
        }

        [TestMethod]
        public void TestSA1003()
        {
            this.ExpectError("SA1003", 1, 10);
            this.ExpectError("SA1003", 1, 11);
            this.ExpectError("SA1003", 2, 10);
            this.ExpectError("SA1003", 3, 10);
            this.ExpectError("SA1003", 4, 14);
            this.ExpectError("SA1003", 5, 8);
            this.ExpectError("SA1003", 5, 10);
            this.ExpectError("SA1003", 5, 12);
            this.ExpectError("SA1003", 8, 28);
            this.ExpectError("SA1003", 8, 29);
            this.ExpectError("SA1008", 9, 23);
            this.ExpectError("SA1003", 9, 34);
            this.ExpectError("SA1008", 13, 22);
            this.ExpectError("SA1003", 16, 36);
            this.ExpectError("SA1003", 16, 37);
            this.ExpectError("SA1003", 16, 40);
            this.ExpectError("SA1003", 23, 29);
            this.ExpectError("SA1003", 23, 30);
            this.ExpectError("SA1008", 24, 31);
            this.ExpectError("SA1003", 28, 18);
            this.ExpectError("SA1003", 28, 19);
            this.ExpectError("SA1003", 28, 25);
            this.ExpectError("SA1003", 36, 27);
            this.ExpectError("SA1003", 36, 28);
            this.ExpectError("SA1003", 36, 44);
            this.ExpectError("SA1003", 44, 18);
            this.ExpectError("SA1003", 46, 17);
            this.ExpectError("SA1003", 46, 18);
            this.Analyze(@"SpacingFailures\SA1003_Fail.ts");
        }

        [TestMethod]
        public void TestSA1004()
        {
            this.ExpectError("SA1004", 4, 2);
            this.ExpectError("SA1004", 9, 2);
            this.ExpectError("SA1004", 12, 16);
            this.Analyze(@"SpacingFailures\SA1004_Fail.ts");
        }

        [TestMethod]
        public void TestSA1005()
        {
            this.ExpectError("SA1005", 1, 1);
            this.ExpectError("SA1005", 3, 1);
            this.Analyze(@"SpacingFailures\SA1005_Fail.ts");
        }

        [TestMethod]
        public void TestSA1008()
        {
            this.ExpectError("SA1008", 1, 6);
            this.ExpectError("SA1008", 1, 12);
            this.ExpectError("SA1008", 2, 15);
            this.Analyze(@"SpacingFailures\SA1008_Fail.ts");
        }

        [TestMethod]
        public void TestSA1012()
        {
            this.ExpectError("SA1012", 1, 9);
            this.ExpectError("SA1000", 2, 7);
            this.ExpectError("SA1012", 2, 10);
            this.ExpectError("SA1012", 5, 12);
            this.ExpectError("SA9011", 5, 12);
            this.Analyze(@"SpacingFailures\SA1012_Fail.ts");
        }

        [TestMethod]
        public void TestSA1020()
        {
            this.ExpectError("SA1020", 1, 11);
            this.ExpectError("SA1020", 2, 11);
            this.Analyze(@"SpacingFailures\SA1020_Fail.ts");
        }

        [TestMethod]
        public void TestSA1021()
        {
            this.ExpectError("SA1021", 1, 11);
            this.ExpectError("SA1021", 2, 10);
            this.ExpectError("SA1021", 2, 11);
            this.Analyze(@"SpacingFailures\SA1021_Fail.ts");
        }

        [TestMethod]
        public void TestSA1022()
        {
            this.ExpectError("SA1022", 1, 11);
            this.ExpectError("SA1022", 2, 10);
            this.ExpectError("SA1022", 2, 11);
            this.Analyze(@"SpacingFailures\SA1022_Fail.ts");
        }

        [TestMethod]
        public void TestSA1027()
        {
            this.ExpectError("SA1027", 1, 3);
            this.ExpectError("SA1027", 6, 1);
            this.ExpectError("SA1027", 8, 15);
            this.ExpectError("SA1027", 9, 1);
            this.ExpectError("SA1027", 10, 1);
            this.ExpectError("SA1027", 11, 1);
            this.Analyze(@"SpacingFailures\SA1027_Fail.ts");
        }
    }
}
