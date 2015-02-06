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

    /**
     * entry point for printing helper
     */ 
    run() {
        this.printHeader();
        if (this.cliArgs.length == 0) {
            this.printGeneralUsage();            
        } else if (this.cliArgs.length == 1) {
            this.printCommandUsage(this.cliArgs[0])            
        }
    }

    /**
     * prints out Microsoft header
     */
    public printHeader(): void {
        logger.logNewLine("\n=================================================================", level.Normal);
    }

    /**
     * prints out general usage of all support TACO commands
     */
    public printGeneralUsage(): void {      
        logger.logNewLine("\nGeneral Usage", level.Normal);
    }

    /**
     * prints out specific usage, i.e. TACO help create
     * @param {string} command - TACO command being inquired
     */
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

    /**
     * helper function to print out [name --- description] pairs for args and options
     * @param {INameDescription[]} nameValuePairs - name-value pairs
     * @param {string} indentFromLeft - string to insert from left
     */
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