/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/colors.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />


import nopt = require("nopt");
var colors = require("colors");
import tacoUtility = require("taco-utils");
import commandsFactory = tacoUtility.Commands.CommandFactory;
import logger = tacoUtility.Logger;
import level = logger.Level;
/*
 * Help
 *
 * handles "Taco Help"
 */
class Help extends tacoUtility.Commands.Command { 
    private indent: string = "   ";
    private charsToDescription: number = 35;
    private maxRight = 70;

    run() {
        this.printHeader();
        if (this.cliArgs.length == 0) {
            this.printGeneralUsage();            
        } else if (this.cliArgs.length == 1) {
            this.printCommandUsage(this.cliArgs[0])            
        }
    }

    public printHeader(): void {
        logger.logNewLine("\n=================================================================", level.Normal);
    }

    public printGeneralUsage(): void {      
        console.log("General Help!!");
    }

    public printCommandUsage(command: string): void {
        if (!commandsFactory.Listings || !commandsFactory.Listings[command]) {
            this.printGeneralUsage();
            return;
        }

        var list: tacoUtility.Commands.ICommandInfo = commandsFactory.Listings[command];
        logger.logNewLine("Synopsis\n", level.NormalBold);
        logger.logNewLine(this.indent + list.synopsis + "\n", level.Success);
        logger.logNewLine(list.description + "\n", level.NormalBold);
        this.printCommandTable(list.args, this.indent);        
        logger.logNewLine("\n" + this.indent + "Options:\n", level.NormalBold);
        this.printCommandTable(list.options, this.indent + this.indent);
    }

    public printCommandTable(nameValuePairs: tacoUtility.Commands.INameDescription[], indentFromLeft: string) {
        nameValuePairs.forEach(nvp => {
            logger.log(indentFromLeft + nvp.name, level.Warn);
            logger.log(" ", level.Normal);
            for (var i: number = indentFromLeft.length + nvp.name.length + 2;
                i < this.charsToDescription; i++) {
                logger.log(".", level.Normal);
            }

            if (this.charsToDescription + nvp.description.length > this.maxRight) {
            }
            logger.log(" " + nvp.description + "\n", level.Normal);
        });
    }
}

export = Help;