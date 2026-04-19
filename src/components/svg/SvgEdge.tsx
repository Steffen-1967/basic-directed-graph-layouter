import React from 'react';
import { GraphNode, GraphEdge, EdgeType, LayoutType, getLangValue } from '../../manifest';
import { getEdgeGeometry, pointsToSvgPath, Edge } from '../../renderer';

interface SvgEdgeProps {
  fromNode: GraphNode;
  toNode: GraphNode;
  edge?: GraphEdge;
  layoutType: LayoutType;
  isSelected: boolean;
  isHovered: boolean;
  colors: any;
  allNodes: GraphNode[];
  lvlW: number;
  rowH: number;
  switchToListLevel: number;
  onSelect: (edge: Edge) => void;
  onMouseEnter: (edge: Edge) => void;
  onMouseLeave: () => void;
}

export const SvgEdge: React.FC<SvgEdgeProps> = ({
  fromNode,
  toNode,
  edge,
  layoutType,
  isSelected,
  isHovered,
  colors,
  allNodes,
  lvlW,
  rowH,
  switchToListLevel,
  onSelect,
  onMouseEnter,
  onMouseLeave
}) => {
  // Use getEdgeGeometry without context
  const geo = getEdgeGeometry(null as any, fromNode, toNode, edge, layoutType, switchToListLevel, allNodes, lvlW, rowH);
  
  let edgeColor = isSelected ? '#007bff' : (isHovered ? (colors.AnchorHandleHover || '#ADD8E6') : colors.CommonArrow);
  if (!isSelected && !isHovered && layoutType === LayoutType.ForceAtlas && edge?.type) {
    if (edge.type === EdgeType.Parent) edgeColor = colors.ParentArrow || '#006400';
    else if (edge.type === EdgeType.Predecessor) edgeColor = colors.PredecessorArrow || '#4A5D4E';
    else if (edge.type === EdgeType.Responsible) edgeColor = colors.ResponsibleArrow || '#A52A2A';
    else if (edge.type.includes('input')) edgeColor = colors.InputArrow || '#AAA';
    else if (edge.type.includes('output')) edgeColor = colors.OutputArrow || '#AAA';
    else if (edge.type === EdgeType.Uses) edgeColor = colors.UsesArrow || '#AA9933';
  }

  const d = pointsToSvgPath(geo.path, geo.isQuadratic, geo.controlPoint);
  const strokeWidth = isSelected || isHovered ? 3 : 2;

  const handleEdgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Pass the click coordinates in world space (SVG coordinates)
    const rect = e.currentTarget.getBoundingClientRect();
    onSelect({ fromId: fromNode.id, toId: toNode.id });
  };

  const handleMouseEnter = () => {
    onMouseEnter({ fromId: fromNode.id, toId: toNode.id });
  };

  return (
    <g 
      onMouseDown={handleEdgeClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer' }}
    >
      {/* Transparent thick line for easier hovering */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth="15"
      />
      <path
        d={d}
        fill="none"
        stroke={edgeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={`url(#arrowhead-${edgeColor.replace('#', '')})`}
      />
      {geo.labelText && geo.labelPosition && (
        <g transform={`translate(${geo.labelPosition.x}, ${geo.labelPosition.y})`}>
          <rect
            x="-20"
            y="-7"
            width="40"
            height="14"
            fill="white"
            fillOpacity="0.8"
            rx="2"
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill="#212529"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {geo.labelText}
          </text>
        </g>
      )}
    </g>
  );
};
