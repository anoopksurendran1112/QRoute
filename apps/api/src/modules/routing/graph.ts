// Graph utilities for routing

import type { RoutingEdge, RoutingGraph, RoutingNode } from "./types.ts";

export function createGraph(): RoutingGraph {
  return {
    nodes: new Map(),
    adjacency: new Map(),
  };
}

export function addNode(graph: RoutingGraph, node: RoutingNode): void {
  graph.nodes.set(node.id, node);
  if (!graph.adjacency.has(node.id)) {
    graph.adjacency.set(node.id, []);
  }
}

export function addEdge(graph: RoutingGraph, edge: RoutingEdge): void {
  if (!graph.adjacency.has(edge.from)) {
    graph.adjacency.set(edge.from, []);
  }
  graph.adjacency.get(edge.from)!.push(edge);

  if (edge.bidirectional) {
    const reverseEdge: RoutingEdge = {
      ...edge,
      id: edge.id + "_rev",
      from: edge.to,
      to: edge.from,
    };
    if (!graph.adjacency.has(reverseEdge.from)) {
      graph.adjacency.set(reverseEdge.from, []);
    }
    graph.adjacency.get(reverseEdge.from)!.push(reverseEdge);
  }
}

export function buildGraph(nodes: RoutingNode[], edges: RoutingEdge[]): RoutingGraph {
  const graph = createGraph();
  for (const node of nodes) {
    addNode(graph, node);
  }
  for (const edge of edges) {
    addEdge(graph, edge);
  }
  return graph;
}

export function getNeighbors(graph: RoutingGraph, nodeId: string): RoutingEdge[] {
  return graph.adjacency.get(nodeId) || [];
}

export function getNode(graph: RoutingGraph, nodeId: string): RoutingNode | undefined {
  return graph.nodes.get(nodeId);
}

export function validateGraph(graph: RoutingGraph): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [nodeId, edges] of graph.adjacency.entries()) {
    if (!graph.nodes.has(nodeId)) {
      errors.push(`Node ${nodeId} has edges but not in nodes map`);
    }
    for (const edge of edges) {
      if (!graph.nodes.has(edge.to)) {
        errors.push(`Edge ${edge.id} points to non-existent node ${edge.to}`);
      }
      if (edge.costM <= 0) {
        errors.push(`Edge ${edge.id} has non-positive cost`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}
