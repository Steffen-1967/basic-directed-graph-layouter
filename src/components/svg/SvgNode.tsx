import React from 'react';
import { GraphNode, LayoutType, getLangValue, EvaluationType, RENDER_CONFIG, NodeType } from '../../manifest';
import { getNodeDimensions, getNodeGeometry, calculateAnchorHandles, calculateNodeBoundingBox } from '../../renderer';

interface SvgNodeProps {
  node: GraphNode;
  layoutType: LayoutType;
  isSelected: boolean;
  isHovered: boolean;
  isEditable: boolean;
  colors: any;
  onSelect: (node: GraphNode) => void;
  onMouseEnter: (node: GraphNode) => void;
  onMouseLeave: () => void;
  onDoubleClick: (node: GraphNode) => void;
}

export const SvgNode: React.FC<SvgNodeProps> = ({
  node,
  layoutType,
  isSelected,
  isHovered,
  isEditable,
  colors,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  onDoubleClick
}) => {
  const x = node._x ?? 0;
  const y = node._y ?? 0;

  const geo = getNodeGeometry(null, node, layoutType);
  const { width, height } = geo.boundingBox;
  const { shape } = geo;
  
  const fillColor = node.overrideFillColor || colors[node.type] || colors['default'] || '#eee';
  let strokeColor = node.overrideStrokeColor || colors.Stroke || '#495057';
  let strokeWidth = 2;

  if (isSelected) {
    strokeColor = '#007bff';
    strokeWidth = 3;
  } else if (isHovered) {
    strokeColor = colors.AnchorHandleHover || '#ADD8E6';
    strokeWidth = 3;
  }

  const renderShape = () => {
    switch (shape) {
      case 'circle':
        return <circle cx="0" cy="0" r={width * 0.5} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />;
      case 'diamond':
        const hw = width * 0.5;
        const hh = height * 0.5;
        return (
          <path
            d={`M 0 ${-hh} L ${hw} 0 L 0 ${hh} L ${-hw} 0 Z`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      case 'rect':
        return (
          <rect
            x={-width * 0.5}
            y={-height * 0.5}
            width={width}
            height={height}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      default: // roundedRect and others
        return (
          <rect
            x={-width * 0.5}
            y={-height * 0.5}
            width={width}
            height={height}
            rx="10"
            ry="10"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
    }
  };

  const renderIcons = () => {
    if (shape === 'roundedRectWithBox') {
      const squareSize = 12;
      const squareX = -squareSize * 0.5;
      const squareY = height * 0.5 - squareSize - 5;
      return (
        <g>
          <rect x={squareX} y={squareY} width={squareSize} height={squareSize} fill="none" stroke={strokeColor} strokeWidth="2" />
          <line x1={squareX + 2} y1={squareY + squareSize * 0.5} x2={squareX + squareSize - 2} y2={squareY + squareSize * 0.5} stroke={strokeColor} strokeWidth="1.5" />
          <line x1={squareX + squareSize * 0.5} y1={squareY + 2} x2={squareX + squareSize * 0.5} y2={squareY + squareSize - 2} stroke={strokeColor} strokeWidth="1.5" />
        </g>
      );
    }
    
    if (shape === 'roundedRectWithEvaluators') {
        const renderEvalIcon = (type: EvaluationType, posX: number, posY: number, align: 'start' | 'end') => {
            let symbol = ''; let subSymbol = '';
            switch (type) {
                case EvaluationType.Event: symbol = '○'; break;
                case EvaluationType.SingleAnd: symbol = '&'; break;
                case EvaluationType.MultipleAnd: symbol = '&'; subSymbol = '+'; break;
                case EvaluationType.SingleOr: symbol = '1'; break;
                case EvaluationType.MultipleOr: symbol = '≥1'; break;
            }
            return (
                <text x={posX} y={posY} textAnchor={align} fontSize="12" fontWeight="bold" fill={colors.Stroke || '#495057'}>
                    {symbol}
                    {subSymbol && <tspan dy="-5" fontSize="8">{subSymbol}</tspan>}
                </text>
            );
        };

        return (
            <g>
                {node._incomingEvaluation && renderEvalIcon(node._incomingEvaluation, -width * 0.5, -height * 0.5 - 5, 'start')}
                {node._outgoingEvaluation && renderEvalIcon(node._outgoingEvaluation, width * 0.5, height * 0.5 + 12, 'end')}
            </g>
        );
    }

    return null;
  };

  const renderHandles = () => {
    if (!isSelected || !isEditable) return null;
    
    const bbox = calculateNodeBoundingBox(node, layoutType);
    const anchors = calculateAnchorHandles(bbox, node.type, x, y, layoutType);
    
    const offset = 2; // matches HANDLE_OFFSET in renderer.ts
    const size = 10;   // matches CORNER_HANDLE_SIZE
    const handleStrokeColor = '#6c75ad';
    
    return (
      <g>
        {/* Corner Handles */}
        <path d={`M ${bbox.minX - offset - x} ${bbox.minY - offset - y + size} L ${bbox.minX - offset - x} ${bbox.minY - offset - y} L ${bbox.minX - offset - x + size} ${bbox.minY - offset - y}`} fill="none" stroke={handleStrokeColor} strokeWidth="2" />
        <path d={`M ${bbox.maxX + offset - x - size} ${bbox.minY - offset - y} L ${bbox.maxX + offset - x} ${bbox.minY - offset - y} L ${bbox.maxX + offset - x} ${bbox.minY - offset - y + size}`} fill="none" stroke={handleStrokeColor} strokeWidth="2" />
        <path d={`M ${bbox.minX - offset - x} ${bbox.maxY + offset - y - size} L ${bbox.minX - offset - x} ${bbox.maxY + offset - y} L ${bbox.minX - offset - x + size} ${bbox.maxY + offset - y}`} fill="none" stroke={handleStrokeColor} strokeWidth="2" />
        <path d={`M ${bbox.maxX + offset - x - size} ${bbox.maxY + offset - y} L ${bbox.maxX + offset - x} ${bbox.maxY + offset - y} L ${bbox.maxX + offset - x} ${bbox.maxY + offset - y - size}`} fill="none" stroke={handleStrokeColor} strokeWidth="2" />

        {/* Anchor Handles */}
        {Object.entries(anchors).map(([key, anchor]) => (
          <circle
            key={key}
            cx={anchor.x - x}
            cy={anchor.y - y}
            r="4"
            fill={colors.AnchorHandle || '#6c75ad'}
            stroke="white"
            strokeWidth="1"
            style={{ cursor: 'crosshair' }}
          />
        ))}
      </g>
    );
  };

  const isBelowText = (layoutType === LayoutType.Flow || layoutType === LayoutType.CompactFlow) && 
                      (node.type === NodeType.Event || node.type === NodeType.Rule);

  const renderText = () => {
    const textX = 0;
    let textY = 0;
    let maxWidth = width - 10;

    if (isBelowText) {
        textY = height * 0.5 + 10;
        maxWidth = node.type === NodeType.Event ? width * 3 : width;
    }

    // Re-calculate geometry for text wrapping if needed, but since we are in SVG, 
    // we just use the lines from getNodeGeometry which already did wrapping based on width - 10.
    // However, if isBelowText is true, we might want different wrapping.
    // For now, let's just render the lines we have, but adjust Y.
    
    return geo.textLines.map((line, i) => {
      const lineHeight = 14;
      const totalTextHeight = geo.textLines.length * lineHeight;
      const lineY = isBelowText 
        ? textY + i * lineHeight 
        : (i - (geo.textLines.length - 1) * 0.5) * lineHeight;
        
      return (
        <text
          key={i}
          x={textX}
          y={lineY}
          textAnchor="middle"
          dominantBaseline={isBelowText ? "hanging" : "middle"}
          fontSize="10"
          fill={colors.Text || '#212529'}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {line}
        </text>
      );
    });
  };

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseDown={(e) => { e.stopPropagation(); onSelect(node); }}
      onMouseEnter={() => onMouseEnter(node)}
      onMouseLeave={onMouseLeave}
      onDoubleClick={() => { console.log(`[SVG-NODE] Double-click on ${node.id}`); onDoubleClick(node); }}
      style={{ cursor: 'pointer' }}
    >
      {renderShape()}
      {renderIcons()}
      {renderText()}
      {renderHandles()}
    </g>
  );
};
