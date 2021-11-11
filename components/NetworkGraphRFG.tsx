const ForceGraph = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});
import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import { GraphData, NodeObject, LinkObject } from "react-force-graph-2d";

type ENodeObject = NodeObject & {
  val?: number;
  vis?: boolean;
  neighbors?: ENodeObject[];
  links?: ELinkObject[];
};

type ELinkObject = LinkObject & {
  vis?: boolean;
};

interface EGraphData {
  nodes: ENodeObject[];
  links: ELinkObject[];
}

export const NetworkGraphRFG = (graphData: GraphData) => {
  const defaultPruneValue = 15;
  const defaultCurvatureState = 1;
  const defaultMaxVisibleVal = 150;

  const [curvatureState, setCurvatureState] = useState(defaultCurvatureState);
  const [treeState, setTreeState] = useState(graphData);
  const [clickedHighlightNodes, setClickedHighlightNodes] = useState<
    ENodeObject[] | undefined
  >([]);
  const [clickedHighlightLinks, setClickedHighlightLinks] = useState<
    LinkObject[]
  >([]);
  const [hoveredHighlightNodes, setHoveredHighlightNodes] = useState<
    ENodeObject[] | undefined
  >([]);
  const [hoveredHighlightLinks, setHoveredHighlightLinks] = useState<
    LinkObject[]
  >([]);
  const [hoverNode, setHoverNode] = useState<ENodeObject | undefined>(
    undefined
  );
  const [clickedNode, setClickedNode] = useState<NodeObject | undefined>(
    undefined
  );
  const [panelState, setPanelState] = useState(true);

  const nodesById = useMemo(() => {
    const nodesById = Object.fromEntries(
      graphData.nodes.map((node) => [node.id, node])
    );
    return nodesById;
  }, [graphData]);

  const data = useMemo(() => {
    graphData.links.forEach((link) => {
      if (typeof link.source === "string" && typeof link.target === "string") {
        const source = nodesById[link.source];
        const target = nodesById[link.target];
        !source.neighbors && (source.neighbors = []);
        !target.neighbors && (target.neighbors = []);
        source.neighbors.push(target);
        target.neighbors.push(source);

        !source.links && (source.links = []);
        !target.links && (target.links = []);
        source.links.push(link);
        target.links.push(link);
      }
    });
    return graphData as EGraphData;
  }, [graphData, nodesById]);

  const getPrunedTree = useCallback(
    (value) => {
      console.log(data.links[0]);
      data.nodes.map((node) => {
        if (node.val === undefined || node.val < value) {
          node.vis = false;
        } else {
          node.vis = true;
        }
      });

      data.links.map((link) => {
        if (
          nodesById[link.source as string] !== undefined &&
          nodesById[link.source as string].vis &&
          nodesById[link.target as string].vis
        ) {
          link.vis = true;
        } else if (
          //TODO why is the structure mutating?
          /* @ts-ignore */
          nodesById[link.source.id] !== undefined &&
          /* @ts-ignore */
          nodesById[link.source.id].vis &&
          /* @ts-ignore */
          nodesById[link.target.id].vis
        ) {
          link.vis = true;
        } else {
          link.vis = false;
        }
      });

      return data;
    },
    [nodesById, data]
  );

  useEffect(() => {
    setTreeState(getPrunedTree(defaultPruneValue));
  }, [getPrunedTree]);

  const connectionMarks: number[] = [];
  for (let i = 0; i < defaultMaxVisibleVal; i += 10) {
    connectionMarks[i] = i;
  }

  const updateClickedHighlight = () => {
    setClickedHighlightNodes(clickedHighlightNodes);
    setClickedHighlightLinks(clickedHighlightLinks);
  };

  const updateHoveredHighlight = () => {
    setHoveredHighlightNodes(hoveredHighlightNodes);
    setHoveredHighlightLinks(hoveredHighlightLinks);
  };

  //TODO: DON'T MUTATE STATE
  const handleNodeClicked = <T extends ENodeObject>(node: T) => {
    const n = [];
    const l: LinkObject[] = [];
    if (node) {
      n.push(node);
      if (node.neighbors) {
        node.neighbors.forEach((neighbor) => n.push(neighbor));
      }
      if (node.links) {
        node.links.forEach((link) => l.push(link));
      }
    }
    setClickedNode(node || undefined);
    setClickedHighlightNodes(n);
    setClickedHighlightLinks(l);
  };

  const handleNodeHover = <T extends ENodeObject>(node: T) => {
    const n = [];
    const l: LinkObject[] = [];
    if (node) {
      n.push(node);
      if (node.neighbors) {
        node.neighbors.forEach((neighbor) => n.push(neighbor));
      }
      if (node.links) {
        node.links.forEach((link) => l.push(link));
      }
    }

    setHoverNode(node || undefined);
    setHoveredHighlightNodes(n);
    setHoveredHighlightLinks(l);
  };

  const handleLinkClicked = <T extends LinkObject>(link: T) => {
    const n: ENodeObject[] = [];
    const l: LinkObject[] = [];

    if (link) {
      l.push(link);
      n.push(link.source as ENodeObject);
      n.push(link.target as ENodeObject);
    }

    setClickedHighlightNodes(n);
    setClickedHighlightLinks(l);
  };

  const handleLinkHovered = <T extends LinkObject>(link: T) => {
    const n: ENodeObject[] = [];
    const l: LinkObject[] = [];

    if (link) {
      l.push(link);
      n.push(link.source as ENodeObject);
      n.push(link.target as ENodeObject);
    }

    setHoveredHighlightNodes(n);
    setHoveredHighlightLinks(l);
  };

  //TODO CLEAN UP
  const paintRing = useCallback(
    (node, ctx) => {
      // add ring just for highlighted nodes
      ctx.beginPath();
      ctx.arc(
        node.x,
        node.y,
        //circle diameter
        //TODO find a better function to calculate this
        Math.log(node.val + 2) / Math.log(1.1),
        0,
        2 * Math.PI,
        false
      );
      if (node === hoverNode || node === clickedNode) {
        ctx.fillStyle = "red";
      } else {
        ctx.fillStyle = "green";
      }
      ctx.fill();
    },
    [clickedNode, hoverNode]
  );

  return (
    <div className="flex flex-row">
      <div className="w-2/12 absolute z-10 bg-gray-900 border-2 border-black">
        <div className="flex flex-col p-4 items-center">
          <label>Curvature</label>
          <Slider
            min={0}
            max={3}
            marks={{ 0: 0, 1: 1, 2: 2, 3: 3 }}
            defaultValue={curvatureState}
            onChange={(value) => setCurvatureState(value)}
          />
        </div>
        <div className="flex flex-col p-4 items-center">
          <label>Min Connections</label>
          <Slider
            min={0}
            max={data.nodes[0].val}
            marks={connectionMarks}
            defaultValue={defaultPruneValue}
            onChange={(value) => setTreeState(getPrunedTree(value))}
          />
        </div>
        <div className="flex flex-col m-4 items-center border-2 border-black">
          <button className="z-10" onClick={() => setPanelState(!panelState)}>
            Open Info Panel
          </button>
        </div>
      </div>

      <div className="w-10/12">
        <ForceGraph
          graphData={treeState}
          nodeLabel="id"
          linkCurvature={curvatureState}
          //nodeAutoColorBy="val"
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          //onNodeClick={handleNodeClick}
          nodeVisibility={"vis"}
          linkVisibility={"vis"}
          nodeColor={() => {
            return "blue";
          }}
          linkColor={() => {
            return "black";
          }}
          linkDirectionalArrowColor={() => {
            return "white";
          }}
          linkDirectionalParticleColor={() => {
            return "white";
          }}
          autoPauseRedraw={false}
          linkWidth={(link) =>
            clickedHighlightLinks.includes(link) ||
            hoveredHighlightLinks.includes(link)
              ? 5
              : 1
          }
          linkDirectionalParticles={4}
          linkDirectionalParticleWidth={(link) =>
            clickedHighlightLinks.includes(link) ||
            hoveredHighlightLinks.includes(link)
              ? 4
              : 0
          }
          nodeCanvasObjectMode={() => "before"}
          nodeCanvasObject={(node, ctx) => {
            if (
              (clickedHighlightNodes && clickedHighlightNodes.includes(node)) ||
              (hoveredHighlightNodes && hoveredHighlightNodes.includes(node))
            ) {
              paintRing(node, ctx);
            }
          }}
          onNodeHover={(node) => handleNodeHover(node as ENodeObject)}
          onNodeClick={handleNodeClicked}
          onLinkHover={(link) => handleLinkHovered(link as LinkObject)}
          onLinkClick={handleLinkClicked}
        />
      </div>

      {panelState && (
        <div className="w-2/12 overflow-auto h-screen z-10 border-2 border-black bg-gray-900">
          <div className="p-4 ">
            <label>Parent:</label>
            {clickedHighlightNodes &&
              clickedHighlightNodes.slice(0, 1).map((node) => {
                return <div key={node.id}>{node.id}</div>;
              })}
          </div>
          <div className="p-4">
            <label>Children:</label>
            {clickedHighlightNodes &&
              clickedHighlightNodes.slice(1).map((node) => {
                return <div key={node.id}>{node.id}</div>;
              })}
          </div>
        </div>
      )}
    </div>
  );
};
