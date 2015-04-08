"use strict";
import kitParser = require("./kit-helper");

module TacoKits {
    // put more classes here, known limitation that classes in external modules CANNOT span multiple files    
    /// <disable code="SA1301" justification="We are exporting classes" />
    export var KitHelper = kitParser.KitHelper;
    /// <enable code="SA1301" />
}

export = TacoKits;
