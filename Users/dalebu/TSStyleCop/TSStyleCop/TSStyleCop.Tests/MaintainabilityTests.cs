using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.IO;

namespace TSStyleCop.Tests
{
    [TestClass]
    public class MaintainabilityTests : BaseRuleTest
    {
        [TestMethod]
        public void TestSA1400()
        {
            this.ExpectError("SA1400", 3, 5);
            this.ExpectError("SA1400", 4, 5);
            this.ExpectError("SA1400", 6, 5);
            this.Analyze(@"MaintainabilityFailures\SA1400_Fail.ts");
        }
    }
}
