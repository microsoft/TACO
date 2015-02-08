/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/colors.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />


import nopt = require("nopt");
var colors = require("colors");
import tacoUtility = require("taco-utils");
import commandsFactory = tacoUtility.Commands.CommandFactory;
import resourcesManager = tacoUtility.ResourcesManager;
import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import level = logger.Level;
/*
 * Help
 *
 * handles "Taco Help"
 */
class Help implements commands.ICommand { 
    public info: commands.ICommandInfo;
    private indentWidth: number = 3; //indent string
    private indent: string;
    private charsToDescription: number = 35;  //number of characters from start of line to description text
    private maxRight = 85;  //maximum characters we're allowing in each line
    private tacoString = "taco";

    public canHandleArgs(args: string[]): boolean {
        return true;
    }

    /**
     * entry point for printing helper
     */ 
    run(args: string[]) {
        this.indent = this.generateSpaces(this.indentWidth);
        this.printHeader();
        args = args.splice(3);
        if (args.length == 0) {
            this.printGeneralUsage();            
        } else if (args.length == 1) {
            this.printCommandUsage(args[0])            
        }
    }

    /**
     * prints out Microsoft header
     */
    public printHeader(): void {
        logger.logLine("\n=================================================================", level.Normal);
    }

    /**
     * prints out general usage of all support TACO commands, iterates through commands and their descriptions
     */
    public printGeneralUsage(): void {      
        logger.logLine(resourcesManager.getString("command.help.usage.synopsis") + "\n", level.NormalBold);
        logger.logLine(this.indent + resourcesManager.getString("command.help.taco.usage") + "\n", level.Success);

        var nameValuePairs: tacoUtility.Commands.INameDescription[] = new Array();
        for (var i in commandsFactory.Listings) {
            nameValuePairs.push({ name: i, description: commandsFactory.Listings[i].description});
        }

        this.printCommandTable(nameValuePairs, this.indent); 
    }

    /**
     * prints out specific usage, i.e. TACO help create
     * @param {string} command - TACO command being inquired
     */
    public printCommandUsage(command: string): void {
        if (!commandsFactory.Listings || !commandsFactory.Listings[command]) {
            logger.logErrorLine(resourcesManager.getString("command.help.badcomand", "'" + command + "'") + "\n");
            this.printGeneralUsage();
            return;
        }

        var list: tacoUtility.Commands.ICommandInfo = commandsFactory.Listings[command];
        logger.logLine(resourcesManager.getString("command.help.usage.synopsis") + "\n", level.NormalBold);
        logger.logLine(this.indent + this.tacoString + " " + command + " " + list.synopsis + "\n", level.Success);
        logger.logLine(this.getString(list.description) + "\n", level.NormalBold);
        this.printCommandTable(list.args, this.indent);        
        logger.logLine("\n" + this.indent + resourcesManager.getString("command.help.usage.options") + "\n", level.NormalBold);
        this.printCommandTable(list.options, this.indent + this.indent);
    }

    /**
     * helper function to print out [name --- description] pairs for args and options
     * @param {INameDescription[]} nameValuePairs - array of name-value pairs
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

            //if it exceeded maxRight, start new line at charsToDescription
            var i = this.charsToDescription;
            var spaces = this.generateSpaces(this.charsToDescription - 1);
            var words: string[] = this.getString(nvp.description).split(" ");
            var multipleLines: boolean = false;
            while (words.length > 0) {
                while (i < this.maxRight && words.length > 0) {
                    var currentWord = words.shift();
                    logger.log(" ", level.Normal);
                    logger.log(currentWord, level.Normal);
                    i += currentWord.length + 1;
                }
                if (words.length > 0) {
                    logger.log("\n" + spaces, level.Normal);
                    i = this.charsToDescription;
                }
            }
            logger.log("\n", level.Normal);

            //if (this.charsToDescription + nvp.description.length < this.maxRight) {
            //    var i = 0;
                
            //}


            //logger.log(" " + this.getString(nvp.description) + "\n", level.Normal);
        });
    }

    private generateSpaces(numSpaces: number): string {
        var spaces: string = "";        
        for (var i: number = 0; i < numSpaces; i++){
            spaces = spaces + " ";
        }

        return spaces;
    }

    private getString(id: string): string {
        return resourcesManager.getString(id);
    }
}

export = Help;