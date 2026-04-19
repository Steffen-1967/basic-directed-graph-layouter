import React, { useMemo } from 'react';
import { AppState, InteractionState } from '../../state';
import { LayoutType, RENDER_CONFIG, EdgeType } from '../../manifest';
import { Edge } from '../../renderer';
import { SvgNode } from './SvgNode';
import { SvgEdge } from './SvgEdge';

interface SvgCanvasProps {
  state: AppState;
  onNodeSelect: (node: any) => void;
  onNodeHover: (node: any | null) => void;
  onNodeDoubleClick: (node: any) => void;
  onEdgeSelect: (edge: Edge) => void;
  onEdgeHover: (edge: Edge | null) => void;
  onCanvasMouseDown: (e: React.MouseEvent) => void;
}

export const SvgCanvas: React.FC<SvgCanvasProps> = ({
  state,
  onNodeSelect,
  onNodeHover,
  onNodeDoubleClick,
  onEdgeSelect,
  onEdgeHover,
  onCanvasMouseDown
}) => {
  const { view, interaction, nodes, envelope } = state;
  const layoutType = interaction.activeLayoutType || envelope?.layoutType || LayoutType.Flow;
  
  console.log(`[SVG-CANVAS] Render. Layout: ${layoutType}, Offset: x=${view.offsetX}, y=${view.offsetY}, Zoom: ${view.zoom}`);

  const nodesToDraw = interaction.nodesToLayout || nodes;
  const switchToListLevel = envelope?.layoutPreferences?.switchToListLevel ?? 99;

  // Collect all potential edge colors for markers
  const markerColors = useMemo(() => {
    const colors = new Set<string>();
    colors.add(RENDER_CONFIG.colors.CommonArrow);
    colors.add('#007bff'); // Selection
    colors.add(RENDER_CONFIG.colors.AnchorHandleHover || '#ADD8E6');
    colors.add(RENDER_CONFIG.colors.ParentArrow || '#006400');
    colors.add(RENDER_CONFIG.colors.PredecessorArrow || '#4A5D4E');
    colors.add(RENDER_CONFIG.colors.ResponsibleArrow || '#A52A2A');
    colors.add(RENDER_CONFIG.colors.InputArrow || '#AAA');
    colors.add(RENDER_CONFIG.colors.OutputArrow || '#AAA');
    colors.add(RENDER_CONFIG.colors.UsesArrow || '#AA9933');
    return Array.from(colors);
  }, []);

  const isStructural = layoutType !== LayoutType.Box && layoutType !== LayoutType.TaskList && layoutType !== LayoutType.ForceAtlas;

  const renderEdges = () => {
    const edgeElements: React.ReactNode[] = [];
    const drawn = new Set<string>();

    if (isStructural) {
      nodesToDraw.forEach(n => {
        (n._successorsCalculated || []).forEach(s => {
          const k = `${n.id}|${s.id}|calculated`;
          if (drawn.has(k)) return;
          drawn.add(k);
          
          const edge = n.outgoing?.find(e => e.id === s.id);
          const isHovered = interaction.hoveredEdge?.fromId === n.id && interaction.hoveredEdge?.toId === s.id;
          const isSelected = interaction.selectedEdge?.fromId === n.id && interaction.selectedEdge?.toId === s.id;

          edgeElements.push(
            <SvgEdge
              key={k}
              fromNode={n}
              toNode={s}
              edge={edge}
              layoutType={layoutType}
              isSelected={!!isSelected}
              isHovered={!!isHovered}
              colors={RENDER_CONFIG.colors}
              allNodes={nodesToDraw}
              lvlW={RENDER_CONFIG.colW}
              rowH={RENDER_CONFIG.rowH}
              switchToListLevel={switchToListLevel}
              onSelect={onEdgeSelect}
              onMouseEnter={onEdgeHover}
              onMouseLeave={() => onEdgeHover(null)}
            />
          );
        });
      });
    } else {
      nodesToDraw.forEach(n => {
        (n.outgoing || []).forEach(e => {
          const k = `${n.id}|${e.id}|${e.type || 'd'}`;
          if (drawn.has(k)) return;
          drawn.add(k);
          
          const s = nodesToDraw.find(nn => nn.id === e.id);
          if (s) {
            const isHovered = interaction.hoveredEdge?.fromId === n.id && interaction.hoveredEdge?.toId === e.id;
            const isSelected = interaction.selectedEdge?.fromId === n.id && interaction.selectedEdge?.toId === e.id;

            edgeElements.push(
              <SvgEdge
                key={k}
                fromNode={n}
                toNode={s}
                edge={e}
                layoutType={layoutType}
                isSelected={!!isSelected}
                isHovered={!!isHovered}
                colors={RENDER_CONFIG.colors}
                allNodes={nodesToDraw}
                lvlW={RENDER_CONFIG.colW}
                rowH={RENDER_CONFIG.rowH}
                switchToListLevel={switchToListLevel}
                onSelect={onEdgeSelect}
                onMouseEnter={onEdgeHover}
                onMouseLeave={() => onEdgeHover(null)}
              />
            );
          }
        });
        
        if (layoutType === LayoutType.ForceAtlas && n.incoming) {
          n.incoming.forEach(e => {
            const k = `${e.id}|${n.id}|${e.type || 'd'}`;
            if (drawn.has(k)) return;
            drawn.add(k);
            
            const p = nodesToDraw.find(nn => nn.id === e.id);
            if (p) {
              const isHovered = interaction.hoveredEdge?.fromId === e.id && interaction.hoveredEdge?.toId === n.id;
              const isSelected = interaction.selectedEdge?.fromId === e.id && interaction.selectedEdge?.toId === n.id;

              edgeElements.push(
                <SvgEdge
                  key={k}
                  fromNode={p}
                  toNode={n}
                  edge={e}
                  layoutType={layoutType}
                  isSelected={!!isSelected}
                  isHovered={!!isHovered}
                  colors={RENDER_CONFIG.colors}
                  allNodes={nodesToDraw}
                  lvlW={RENDER_CONFIG.colW}
                  rowH={RENDER_CONFIG.rowH}
                  switchToListLevel={switchToListLevel}
                  onSelect={onEdgeSelect}
                  onMouseEnter={onEdgeHover}
                  onMouseLeave={() => onEdgeHover(null)}
                />
              );
            }
          });
        }
      });
    }
    return edgeElements;
  };

  return (
    <div 
      className="svg-canvas-container" 
      style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
      onMouseDown={onCanvasMouseDown}
    >
      <svg 
        width="100%" 
        height="100%" 
        style={{ display: 'block', background: '#f8f9fa', cursor: 'default' }}
      >
        <defs>
          {markerColors.map(color => (
            <marker
              key={color}
              id={`arrowhead-${color.replace(/#/g, '')}`}
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
            </marker>
          ))}
        </defs>
        
        <g transform={`translate(${view.offsetX}, ${view.offsetY}) scale(${view.zoom})`}>
          <g className="edges-layer">
            {renderEdges()}
          </g>
          <g className="nodes-layer">
            {nodesToDraw.map(node => (
              <SvgNode
                key={node.id}
                node={node}
                layoutType={layoutType}
                isSelected={interaction.selectedNode?.id === node.id}
                isHovered={interaction.hoveredNode?.id === node.id}
                isEditable={interaction.isEditable}
                colors={RENDER_CONFIG.colors}
                onSelect={onNodeSelect}
                onMouseEnter={onNodeHover}
                onMouseLeave={() => onNodeHover(null)}
                onDoubleClick={onNodeDoubleClick}
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
};
