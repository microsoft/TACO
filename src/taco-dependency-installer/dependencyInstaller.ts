/// <reference path="../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/tacoUtils.d.ts" />

"use strict"

import fs = require ("fs");
import path = require ("path");

import installerBase = require ("./installerBase");
import tacoUtils = require ("taco-utils");

interface IVertex {
    outgoingEdges: number[];
    incomingEdges: number[];
}

module TacoDependencyInstaller {
    class DependencyInstaller {
        private static DataFile: string = path.resolve(__dirname, "dependencies.json");
        // TODO use the real cordovaIds when the check_reqs feature is done
        private static IdMap: { [cordovaId: string]: string } = {
            "ant": "ant",
            "gradle": "gradle",
            "ios-deploy": "iosDeploy",
            "ios-sim": "iosSim",
            "java": "javaJdk",
            "msbuild": "msBuild",
        };

        private DependenciesData: DependencyInstallerInterfaces.IDependencyDictionary;
        private InstallersToRun: installerBase.InstallerBase[];

        public run(data: tacoUtils.Commands.ICommandData): Q.Promise<any> {
            // Call into Cordova to check missing dependencies for the current project
            var cordovaResults: string[] = DependencyInstaller.callCordovaCheckDependencies();

            // Check if the results contain a dependency that we don't understand, and warn the user if they do

            // Parse dependencies.json
            this.parseDependenciesData();

            // Extract Cordova results and transform them to an array of dependency ids
            var dependencyArray: string[] = DependencyInstaller.extractDependencyIds(cordovaResults);

            // Convert the Cordova ids to our own taco ids
            dependencyArray = DependencyInstaller.cordovaIdsToTacoIds(dependencyArray);

            // Sort the array of dependency ids based on the order in which they need to be installed
            dependencyArray = this.sortDependencies(dependencyArray);

            // Instantiate the installers that will need to be run

            // Print a list of what is about to be installed, including links to licenses and a disclaimer about reading and agreeing to the licenses

            // Wait for user confirmation

            // Run the insallers in order

            // Print results to the user

            return Q.resolve({});
        }

        private parseDependenciesData(): void {
            this.DependenciesData = JSON.parse(fs.readFileSync(DependencyInstaller.DataFile, "utf8"));
        }

        private sortDependencies(dependencies: string[]): string[] {
            // Perform a topological sort for dependencies based on the order in which they need to be installed
            // Initializations
            var graph: IVertex[] = this.buildDependencyGraph(dependencies);
            var queue: number[] = [];
            var sortedIndexes: number[] = [];

            // Push all vertices with no outgoing edges to the queue
            for (var i: number = 0; i < graph.length; i++) {
                if (graph[i].outgoingEdges.length === 0) {
                    queue.push(i);
                }
            }

            // Perform the sort
            while (queue.length !== 0) {
                // Dequeue a vertex index
                var vertexIndex: number = queue.shift();

                // Add it to the sorted list
                sortedIndexes.push(vertexIndex);

                // Remove this vertex from the outgoing lists of all vertices that had it as a successor
                for (var i: number = 0; i < graph[vertexIndex].incomingEdges.length; i++) {
                    var indexToUpdate: number = graph[vertexIndex].incomingEdges[i];
                    var vertexToUpdate: IVertex = graph[indexToUpdate];

                    if (DependencyInstaller.removeEdgeFromList(indexToUpdate, vertexToUpdate.outgoingEdges)) {
                        // We removed an edge from the outgoing list; check if the outgoing list of that vertex is now empty and enqueue it if needed
                        if (graph[indexToUpdate].outgoingEdges.length === 0) {
                            queue.push(indexToUpdate);
                        }
                    }
                }
            }

            // At this point we have the sorted indexes, we only need to reorder the strings according to these indexes
            var sortedStrings: string[] = [];

            for (var i: number = 0; i < sortedIndexes.length; i++) {
                var nextIndex: number = sortedIndexes[i];

                sortedStrings.push(dependencies[nextIndex]);
            }

            return sortedStrings;
        }

        private buildDependencyGraph(dependencies: string[]): IVertex[] {
            var vertices: IVertex[] = [];

            // Build the vertices
            for (var i: number = 0; i < dependencies.length; i++) {
                var currentDependency: string = dependencies[i];

                var vertex: IVertex = {
                    outgoingEdges: [],
                    incomingEdges: []
                };

                // Build the outgoing list for this vertice
                for (var j: number = 0; j < this.DependenciesData[currentDependency].prerequesites.length; j++) {
                    // If the current dependency has a prerequesite that is in the list of the dependencies we need to install, add that prerequesite's index to this vertex's outgoing list
                    var currentPrerequesite: string = this.DependenciesData[currentDependency].prerequesites[j];
                    var prerequesiteIndex: number = dependencies.indexOf(currentPrerequesite);

                    if (prerequesiteIndex !== -1) {
                        vertex.outgoingEdges.push(prerequesiteIndex);
                    }
                }

                // Build the incoming list for this vertice
                for (var j: number = 0; j < dependencies.length; j++) {
                    // If a dependency has a prerequesite on the current dependency, add its index to this vertex's incoming list
                    var potentialDependent: string = dependencies[j];

                    if (this.DependenciesData[potentialDependent] && this.DependenciesData[potentialDependent].prerequesites.indexOf(currentDependency) !== -1) {
                        vertex.incomingEdges.push(j);
                    }
                }

                vertices.push(vertex);
            }

            return vertices;
        }

        private static callCordovaCheckDependencies(): any[] {
            // TODO Call Cordova when they have added dependency checking
            // TEMP
            return [
                {
                    name: "ant"
                },
                {
                    name: "gradle"
                },
                {
                    name: "ios-deploy"
                },
                {
                    name: "ios-sim"
                },
                {
                    name: "java"
                },
                {
                    name: "msbuild"
                },
                {
                    name: "xcode"
                }
            ];
        }

        private static extractDependencyIds(cordovaChecksResult: any[]): string[] {
            var dependencies: string[] = [];

            cordovaChecksResult.forEach(function (value: any, index: number, array: any[]): void {
                dependencies.push(value["name"]);
            });

            return dependencies;
        }

        private static removeEdgeFromList(vertex: number, list: number[]): boolean {
            var vertexIndex: number = list.indexOf(vertex);

            if (vertexIndex === -1) {
                // Nothing was removed
                return false;
            }

            while (vertexIndex !== -1) {
                list.splice(vertexIndex, 1);
                vertexIndex = list.indexOf(vertex);
            }

            return true;
        }

        private static cordovaIdsToTacoIds(cordovaIds: string[]): string[]{
            var tacoIds: string[] = [];

            for (var i: number = 0; i < cordovaIds.length; i++) {
                if (DependencyInstaller.IdMap[cordovaIds[i]]) {
                    tacoIds.push(DependencyInstaller.IdMap[cordovaIds[i]]);
                }
            }

            return tacoIds;
        }
    }
}