module DirectedAcyclicGraph {
    export interface IVertexIdentifier {
        id: string;
        neighbors: string[]
    }

    export interface IVertex {
        outgoingEdges: number[];
        incomingEdges: number[];
    }
}

class DirectedAcyclicGraph {
    private adjacencyListStringIds: DirectedAcyclicGraph.IVertexIdentifier[];
    private vertices: DirectedAcyclicGraph.IVertex[];

    private static removeEdgeFromList(vertex: number, list: number[]): void {
        list = list.filter(function (value: number): boolean {
            return value !== vertex;
        });
    }

    /*
     * Constructs a directed acyclic graph using an adjacency list consisting of string ids for the vertices
     *
     * @param {DirectedAcyclicGraph.IVertexIdentifier[]} An array of IVertexIdentifier elements, representing the graph
     */
    constructor(adjacencyListStringIds: DirectedAcyclicGraph.IVertexIdentifier[]) {
        this.adjacencyListStringIds = adjacencyListStringIds;
    }

    /*
     * Topologically sorts the graph.
     *
     * @return {string[]} The string identifiers that were given to the constructor of this graph, sorted in topological order
     */
    public topologicalSort(): string[]{
        var self = this;

        this.buildVertexList();

        var queue: number[] = [];
        var sortedIndexes: number[] = [];

        // Push all vertices with no outgoing edges to the queue
        this.vertices.forEach(function (value: DirectedAcyclicGraph.IVertex, index: number): void {
            if (value.outgoingEdges.length === 0) {
                queue.push(index);
            }
        });

        // Perform the sort
        while (queue.length !== 0) {
            // Dequeue a vertex index
            var currentIndex: number = queue.shift();

            // Add it to the sorted list
            sortedIndexes.push(currentIndex);

            // Scan this vertex's incoming list and remove this vertex from the outgoing list of those vertices
            this.vertices[currentIndex].incomingEdges.forEach(function (value: number): void {
                self.vertices[value].outgoingEdges = self.vertices[value].outgoingEdges.filter(function (outgoing: number): boolean {
                    return outgoing !== currentIndex;
                });

                // If we removed the last outgoing edge for the updating vertex, it is ready to be sorted, so enqueue it
                if (self.vertices[value].outgoingEdges.length === 0) {
                    queue.push(value);
                }
            });
        }

        // At this point we have the sorted indexes, we only need to reorder the IDependencyInfo elements according to these indexes
        var sortedArray: string[] = [];

        sortedIndexes.forEach(function (value: number): void {
            sortedArray.push(self.adjacencyListStringIds[value].id);
        });

        return sortedArray;
    }

    private buildVertexList(): void {
        var self = this;

        this.vertices = [];

        // Build the vertices
        this.adjacencyListStringIds.forEach(function (value: DirectedAcyclicGraph.IVertexIdentifier): void {
            var vertex: DirectedAcyclicGraph.IVertex = {
                outgoingEdges: [],
                incomingEdges: []
            };

            // Build the outgoing list for this vertex
            value.neighbors.forEach(function (value: string): void {
                var outgoingIndex: number = self.findVertexIdentifierIndex(value);

                if (outgoingIndex !== -1) {
                    vertex.outgoingEdges.push(outgoingIndex);
                }
            });

            // Build the incoming list for this vertex
            self.adjacencyListStringIds.forEach(function (vertexIdentifier: DirectedAcyclicGraph.IVertexIdentifier, index: number): void {
                if (vertexIdentifier.neighbors.indexOf(value.id) !== -1) {
                    vertex.incomingEdges.push(index);
                }
            });

            self.vertices.push(vertex);
        });
    }

    private findVertexIdentifierIndex(id: string): number {
        var vertexIndex: number = -1;

        // array.some() breaks as soon as it finds an element matching the condition, which is why it is preferred over forEach
        this.adjacencyListStringIds.some(function(value: DirectedAcyclicGraph.IVertexIdentifier, index: number): boolean {
            if (value.id === id) {
                vertexIndex = index;

                return true;
            }

            return false;
        });

        return vertexIndex;
    }
}

export = DirectedAcyclicGraph;