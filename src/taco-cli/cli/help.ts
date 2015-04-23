/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/colors.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />
"use strict";
import Q = require ("q");
import tacoUtility = require ("taco-utils");
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
class Help implements commands.IDocumentedCommand { 
    private indentWidth: number = 3; // indent string
    private indent: string;
    private charsToDescription: number = 35;  // number of characters from start of line to description text
    private maxRight = 85;  // maximum characters we're allowing in each line
    private tacoString = "taco";

    public info: commands.ICommandInfo;

    public canHandleArgs(data: commands.ICommandData): boolean {
        if (!data.original || data.original.length === 0) {
            return true;
        }

        return this.commandExists(data.original[0]);
    }

    /**
     * entry point for printing helper
     */ 
    public run(data: commands.ICommandData): Q.Promise<any> {
        this.indent = this.generateSpaces(this.indentWidth);
        this.printHeader();
        if (data.original && data.original.length > 0 && this.commandExists(data.original[0])) {
            this.printCommandUsage(data.original[0]);
        } else {
            this.printGeneralUsage();
        }

        return Q({});
    }

    /**
     * prints out Microsoft header
     */
    public printHeader(): void {
        logger.logLine("\n=================================================================");
    }

    /**
     * prints out general usage of all support TACO commands, iterates through commands and their descriptions
     */
    public printGeneralUsage(): void {      
        logger.logLine(resourcesManager.getString("command.help.usage.synopsis") + "\n", level.NormalBold);
        logger.logLine(this.indent + resourcesManager.getString("command.help.taco.usage") + "\n", level.Success);

        var nameValuePairs: tacoUtility.Commands.INameDescription[] = new Array();
        for (var i in commandsFactory.Listings) {
            nameValuePairs.push({
                name: i,
                description: commandsFactory.Listings[i].description
            });
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
        logger.logLine(this.getDescriptionString(list.description) + "\n", level.NormalBold);
        this.printCommandTable(list.args, this.indent);        
        logger.logLine("\n" + this.indent + resourcesManager.getString("command.help.usage.options") + "\n", level.NormalBold);
        this.printCommandTable(list.options, this.indent + this.indent);
    }

    /**
     * helper function to print out [name --- description] pairs for args and options
     * @param {INameDescription[]} nameValuePairs - array of name-value pairs
     * @param {string} indentFromLeft - string to insert from left
     */
    public printCommandTable(nameValuePairs: tacoUtility.Commands.INameDescription[], indentFromLeft: string): void {
        nameValuePairs.forEach(nvp => {
            logger.log(indentFromLeft + nvp.name, level.Warn);
            logger.log(" ", level.Normal);
            for (var i: number = indentFromLeft.length + nvp.name.length + 2;
                i < this.charsToDescription; i++) {
                logger.log(".", level.Normal);
            }

            // if it exceeded maxRight, start new line at charsToDescription
            var i = this.charsToDescription;
            var spaces = this.generateSpaces(this.charsToDescription - 1);
            var words: string[] = this.getDescriptionString(nvp.description).split(" ");
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
        });
    }

    /**
     * helper function to generate spaces and indentations needed for printing usage
     * @param {number} numSpaces - number of spaces to generate
     */
    private generateSpaces(numSpaces: number): string {
        var spaces: string = "";        
        for (var i: number = 0; i < numSpaces; i++) {
            spaces = spaces + " ";
        }

        return spaces;
    }

    /**
     * helper function to get string from resources.json
     * @param {string} id - string to get
     */
    private getString(id: string): string {
        return resourcesManager.getString(id);
    }

    /**
     * helper function to strip out square brackets from  ["abc"] and get string from resources.json
     * if no bracket, just return the string
     * @param {string} id - string to get
     */
    private getDescriptionString(id: string): string { 
        var found: any = id.match("\\[.*\\]");
        if (found) {
            id = id.slice(1, id.length - 1);
            return this.getString(id);
        } else {
            return id;
        }        
    }

    /**
     * looks up commands.json and see if command is authored as supported
     * @param {string} id - command to query
     */
    private commandExists(command: string): boolean {
        for (var i in commandsFactory.Listings) {
            if (i === command) {
                return true;
            }
        }

        return false;
    }
}

export = Help;