import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Panel,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEdge,
  createNode,
  deleteEdge,
  deleteNode,
  getFloorGraph,
  updateNode,
} from "../../api/graph.ts";

const FLOORPLAN_NODE_ID = "__floorplan__";

interface FloorPlanNodeData extends Record<string, unknown> {
  imageUrl: string;
  widthPx: number;
  heightPx: number;
}

/**
 * The floor plan is a normal (but non-selectable, non-draggable) node so it
 * pans and zooms with the graph. Node coordinates are image pixels, and the
 * image sits at flow origin (0,0) at its natural size.
 */
function FloorPlanNode({ data }: NodeProps) {
  const { imageUrl, widthPx, heightPx } = data as FloorPlanNodeData;
  return (
    <img
      src={imageUrl}
      width={widthPx}
      height={heightPx}
      draggable={false}
      alt="Floor plan"
      style={{ pointerEvents: "none", userSelect: "none" }}
    />
  );
}

const nodeTypes = { floorplan: FloorPlanNode };

const KIND_COLORS: Record<string, string> = {
  junction: "#2563eb",
  door: "#16a34a",
  stair: "#d97706",
  lift: "#9333ea",
  entrance: "#dc2626",
};

function CanvasInner({ floorId }: { floorId: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [floor, setFloor] = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const reactFlow = useReactFlow();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["floor-graph", floorId],
    queryFn: () => getFloorGraph(floorId),
    enabled: !!floorId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["floor-graph", floorId] });

  const createNodeMutation = useMutation({ mutationFn: (d: any) => createNode(d), onSuccess: invalidate });
  const updateNodeMutation = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => updateNode(id, d),
    onSuccess: invalidate,
  });
  const deleteNodeMutation = useMutation({ mutationFn: (id: string) => deleteNode(id), onSuccess: invalidate });
  const createEdgeMutation = useMutation({ mutationFn: (d: any) => createEdge(d), onSuccess: invalidate });
  const deleteEdgeMutation = useMutation({ mutationFn: (id: string) => deleteEdge(id), onSuccess: invalidate });

  const graph = data?.graph;

  useEffect(() => {
    if (!graph) return;
    setFloor(graph);

    const graphNodes: Node[] = (graph.nodes ?? []).map((node: any) => ({
      id: node.id,
      type: "default",
      position: { x: Number(node.x), y: Number(node.y) },
      data: { label: `${node.code}${node.label && node.label !== node.code ? ` — ${node.label}` : ""}`, ...node },
      style: {
        background: KIND_COLORS[node.kind] ?? "#334155",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: 11,
        padding: 4,
        width: 60,
      },
    }));

    if (graph.imagePath && graph.widthPx && graph.heightPx) {
      graphNodes.unshift({
        id: FLOORPLAN_NODE_ID,
        type: "floorplan",
        position: { x: 0, y: 0 },
        data: {
          imageUrl: graph.imagePath,
          widthPx: Number(graph.widthPx),
          heightPx: Number(graph.heightPx),
        },
        draggable: false,
        selectable: false,
        focusable: false,
        zIndex: -1,
      } as Node);
    }

    const graphEdges: Edge[] = [];
    (graph.nodes ?? []).forEach((node: any) => {
      (node.edgesFrom ?? []).forEach((edge: any) => {
        // Render a bidirectional edge once, not twice.
        if (edge.bidirectional && node.id > edge.toNodeId) return;
        graphEdges.push({
          id: edge.id,
          source: edge.fromNodeId,
          target: edge.toNodeId,
          label: `${Number(edge.costM).toFixed(2)}m`,
          data: edge,
        });
      });
    });

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [graph, setNodes, setEdges]);

  const nodeById = useMemo(() => {
    const map = new Map<string, Node>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target || !graph) return;
      const source = nodeById.get(params.source);
      const target = nodeById.get(params.target);
      if (!source || !target) return;

      const dx = target.position.x - source.position.x;
      const dy = target.position.y - source.position.y;
      const distPx = Math.sqrt(dx * dx + dy * dy);
      const mpp = Number(graph.metersPerPixel ?? 0);
      const costM = mpp > 0 ? Number((distPx * mpp).toFixed(3)) : Number((distPx / 100).toFixed(3));

      try {
        await createEdgeMutation.mutateAsync({
          fromNodeId: params.source,
          toNodeId: params.target,
          kind: "walk",
          costM,
          accessible: true,
          bidirectional: true,
        });
        setStatus(`Edge created (${costM} m)`);
      } catch (e) {
        setStatus((e as Error).message);
      }
    },
    [graph, nodeById, createEdgeMutation],
  );

  const onPaneClick = useCallback(
    async (event: React.MouseEvent) => {
      if (!graph) return;
      const position = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const code = window.prompt("Node code (e.g., N1, ENTR):");
      if (!code) return;
      const kindInput = window.prompt("Node kind (junction/door/stair/lift/entrance):", "junction");
      if (!kindInput) return;
      const kind = ["junction", "door", "stair", "lift", "entrance"].includes(kindInput)
        ? kindInput
        : "junction";

      try {
        await createNodeMutation.mutateAsync({
          floorId,
          code: code.trim(),
          kind,
          x: Math.round(position.x),
          y: Math.round(position.y),
          label: code.trim(),
        });
        setStatus(`Node ${code.trim()} created`);
      } catch (e) {
        setStatus((e as Error).message);
      }
    },
    [graph, reactFlow, floorId, createNodeMutation],
  );

  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      if (node.id === FLOORPLAN_NODE_ID) return;
      updateNodeMutation.mutate({
        id: node.id,
        d: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
      });
    },
    [updateNodeMutation],
  );

  if (isLoading) {
    return <div className="h-[600px] flex items-center justify-center text-sm text-slate-500">Loading graph…</div>;
  }

  if (isError) {
    return (
      <div className="h-[600px] flex items-center justify-center text-sm text-red-600">
        Failed to load graph: {(error as Error).message}
      </div>
    );
  }

  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null;
  const selectedEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) ?? null : null;

  return (
    <div className="h-[600px] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onNodeClick={(_, node) => {
          if (node.id === FLOORPLAN_NODE_ID) return;
          setSelectedNodeId(node.id);
          setSelectedEdgeId(null);
        }}
        onNodeDragStop={onNodeDragStop}
        onEdgeClick={(_, edge) => {
          setSelectedEdgeId(edge.id);
          setSelectedNodeId(null);
        }}
        minZoom={0.05}
        maxZoom={4}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <MiniMap pannable zoomable />
        <Background gap={16} size={1} />
        <Panel position="top-left">
          <div className="rounded bg-white/95 px-2 py-1 text-xs text-slate-700 shadow">
            Click canvas to add a node · Drag between handles to add an edge · Drag nodes to move
            {graph?.metersPerPixel
              ? ` · Auto-cost (${graph.metersPerPixel} m/px)`
              : " · No calibration: cost = px / 100"}
          </div>
        </Panel>
        {status && (
          <Panel position="top-right">
            <div className="rounded bg-slate-900/90 px-2 py-1 text-xs text-white shadow">{status}</div>
          </Panel>
        )}
      </ReactFlow>

      {selectedNode && (
        <div className="absolute bottom-2 left-2 z-10 w-56 rounded border border-slate-300 bg-white p-3 shadow">
          <div className="text-xs font-semibold text-slate-900">
            {(selectedNode.data as any).code} · {(selectedNode.data as any).kind}
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            x {(selectedNode.data as any).x}, y {(selectedNode.data as any).y}
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm("Delete this node and its edges?")) return;
              try {
                await deleteNodeMutation.mutateAsync(selectedNode.id);
                setSelectedNodeId(null);
                setStatus("Node deleted");
              } catch (e) {
                setStatus((e as Error).message);
              }
            }}
            className="mt-2 w-full rounded bg-red-600 px-2 py-1 text-xs text-white"
          >
            Delete Node
          </button>
        </div>
      )}

      {selectedEdge && (
        <div className="absolute bottom-2 left-2 z-10 w-56 rounded border border-slate-300 bg-white p-3 shadow">
          <div className="text-xs font-semibold text-slate-900">
            Edge · {Number((selectedEdge.data as any)?.costM ?? 0).toFixed(2)} m
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            {(selectedEdge.data as any)?.kind} · {(selectedEdge.data as any)?.bidirectional ? "bidirectional" : "one-way"}
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm("Delete this edge?")) return;
              try {
                await deleteEdgeMutation.mutateAsync(selectedEdge.id);
                setSelectedEdgeId(null);
                setStatus("Edge deleted");
              } catch (e) {
                setStatus((e as Error).message);
              }
            }}
            className="mt-2 w-full rounded bg-red-600 px-2 py-1 text-xs text-white"
          >
            Delete Edge
          </button>
        </div>
      )}
    </div>
  );
}

export function FloorGraphCanvas({ floorId }: { floorId: string }) {
  return (
    <ReactFlowProvider>
      <CanvasInner floorId={floorId} />
    </ReactFlowProvider>
  );
}
