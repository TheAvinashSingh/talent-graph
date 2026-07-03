import { useGetTrustGraph, getGetTrustGraphQueryKey } from "@workspace/api-client-react";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ForceGraph2D from "react-force-graph-2d";
import { useTheme } from "@/components/theme-provider";

export default function TrustGraphExplorer() {
  const { data: graph, isLoading } = useGetTrustGraph({}, {
    query: {
      queryKey: getGetTrustGraphQueryKey({}),
    }
  });

  const { theme } = useTheme();
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
  }, []);

  if (isLoading) {
    return <Skeleton className="h-[calc(100vh-100px)] w-full rounded-xl" />;
  }

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const graphData = graph
    ? {
        nodes: graph.nodes.map((n) => ({ ...n })),
        links: graph.edges.map((e) => ({
          source: e.fromCandidateId,
          target: e.toCandidateId,
          relationship: e.relationship,
          strength: e.strength,
        })),
      }
    : null;

  return (
    <Card className="h-[calc(100vh-100px)] border-border relative overflow-hidden" ref={containerRef}>
      {graphData && (
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          nodeColor={(node: any) => node.status === 'PLACED' ? '#22c55e' : '#3b82f6'}
          nodeRelSize={6}
          nodeVal={(node: any) => node.edgeCount * 2 + 1}
          linkColor={() => isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
          linkWidth={(link: any) => link.strength}
          backgroundColor={isDark ? '#020817' : '#ffffff'}
          onNodeClick={(node: any) => {
            // Can be expanded to show a side panel
            console.log("Clicked node", node);
          }}
        />
      )}
      {!graphData && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          No graph data available.
        </div>
      )}
    </Card>
  );
}