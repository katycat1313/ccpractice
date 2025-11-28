import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, ChevronUp, ChevronDown } from 'lucide-react';
import { debugLog, debugError, debugWarn, debugTrace, validateProps, PerformanceTracker } from '../lib/debugUtils';

const AnimatedScriptViewEnhanced = ({
  nodes,
  edges,
  path,
  nextPossibleNodes,
  currentNodeId,
  isRecording,
  isFrozen,
  isEditing,
  playbackSpeed,
  zoom,
  onNodeClick,
  onTextChange,
}) => {
  // Validate props on mount
  useEffect(() => {
    const validation = validateProps('AnimatedScriptViewEnhanced', {
      nodes, edges, path, nextPossibleNodes, currentNodeId,
      isRecording, isFrozen, isEditing, playbackSpeed,
      zoom, onNodeClick, onTextChange,
    }, [
      'nodes', 'edges', 'path', 'nextPossibleNodes', 'currentNodeId',
      'isRecording', 'isFrozen', 'isEditing', 'playbackSpeed',
      'zoom', 'onNodeClick', 'onTextChange',
    ]);
    
    if (!validation.isValid) {
      debugError('AnimatedScriptViewEnhanced', 'Props validation failed', null, validation);
    }
  }, []);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const contentRef = useRef(null);
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [animationQueue, setAnimationQueue] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate animation duration based on playback speed
  const getAnimationDuration = () => {
    if (!playbackSpeed || playbackSpeed <= 0) {
      debugWarn('AnimatedScriptViewEnhanced', 'Invalid playbackSpeed', { playbackSpeed });
      return 800;
    }
    const duration = Math.round(800 / playbackSpeed);
    if (duration < 100 || duration > 5000) {
      debugWarn('AnimatedScriptViewEnhanced', 'Animation duration out of expected range', { duration });
    }
    return duration;
  };

  // When path changes, queue up a new animation
  useEffect(() => {
    if (path.length > 0 && !isAnimating) {
      const lastNodeId = path[path.length - 1];
      debugTrace('AnimatedScriptViewEnhanced', 'path_changed', { 
        pathLength: path.length, 
        lastNodeId,
      });
      setAnimationQueue(prev => [...prev, lastNodeId]);
    }
  }, [path, isAnimating]);

  // Process animation queue
  useEffect(() => {
    if (animationQueue.length === 0 || isAnimating) return;

    setIsAnimating(true);
    const duration = getAnimationDuration();

    debugTrace('AnimatedScriptViewEnhanced', 'animation_start', {
      queueLength: animationQueue.length,
      duration,
      currentNodeId,
    });

    const timer = setTimeout(() => {
      try {
        const currentElement = contentRef.current?.querySelector(
          `[data-node-id="${currentNodeId}"]`
        );
        
        if (!currentElement) {
          debugWarn('AnimatedScriptViewEnhanced', 'Could not find element to scroll to', {
            currentNodeId,
          });
        } else {
          currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          debugTrace('AnimatedScriptViewEnhanced', 'scroll_completed', { currentNodeId });
        }

        setAnimationQueue(prev => {
          const newQueue = prev.slice(1);
          debugTrace('AnimatedScriptViewEnhanced', 'animation_queue_updated', { 
            queueLength: newQueue.length,
          });
          return newQueue;
        });
        setIsAnimating(false);
      } catch (err) {
        debugError('AnimatedScriptViewEnhanced', 'Error during animation', err);
        setIsAnimating(false);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [animationQueue, isAnimating, currentNodeId, playbackSpeed]);

  // Get visible nodes
  const getVisibleNodes = useMemo(() => {
    try {
      if (path.length === 0) return [];

      const pathNodeIds = path;
      const visibleNodeIds = [...pathNodeIds];

      if (!isRecording && !isFrozen && nextPossibleNodes.length > 0) {
        nextPossibleNodes.forEach(node => {
          if (!node || !node.id) {
            debugWarn('AnimatedScriptViewEnhanced', 'Invalid node in nextPossibleNodes', { node });
            return;
          }
          if (!visibleNodeIds.includes(node.id)) {
            visibleNodeIds.push(node.id);
          }
        });
      }

      const visibleNodes = visibleNodeIds
        .map(id => nodes.find(n => n.id === id))
        .filter(Boolean);

      debugTrace('AnimatedScriptViewEnhanced', 'visible_nodes_updated', {
        visibleCount: visibleNodes.length,
        pathCount: pathNodeIds.length,
        nextOptionsCount: nextPossibleNodes.length,
      });

      return visibleNodes;
    } catch (err) {
      debugError('AnimatedScriptViewEnhanced', 'Error calculating visible nodes', err);
      return [];
    }
  }, [path, nodes, nextPossibleNodes, isRecording, isFrozen]);

  // Layout nodes for flowchart using BFS
  const layoutNodes = useMemo(() => {
    const perf = new PerformanceTracker('layoutNodes');
    
    if (!nodes || nodes.length === 0) {
      debugWarn('AnimatedScriptViewEnhanced', 'No nodes to layout');
      return [];
    }

    if (!Array.isArray(edges)) {
      debugWarn('AnimatedScriptViewEnhanced', 'edges is not an array', { type: typeof edges });
      return nodes.map((n, idx) => ({ ...n, x: idx * 250, y: 0 }));
    }

    const positioned = {};
    const visited = new Set();
    const queue = [];

    // Find root nodes (nodes with no incoming edges)
    const rootNodes = nodes.filter(n => !edges.some(e => e.target === n.id));
    
    if (rootNodes.length === 0 && nodes.length > 0) {
      debugWarn('AnimatedScriptViewEnhanced', 'No root nodes found, using first node');
      queue.push({ nodeId: nodes[0].id, x: 0, y: 0, level: 0 });
    } else {
      rootNodes.forEach((node, idx) => {
        queue.push({ nodeId: node.id, x: idx * 300, y: 0, level: 0 });
      });
    }

    // BFS layout
    let iterations = 0;
    const maxIterations = nodes.length * 10;
    
    while (queue.length > 0 && iterations < maxIterations) {
      iterations++;
      const { nodeId, x, y, level } = queue.shift();

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      positioned[nodeId] = { x, y };

      // Find children
      const childEdges = edges.filter(e => e.source === nodeId);
      childEdges.forEach((edge, idx) => {
        if (!visited.has(edge.target)) {
          const childX = x + (idx - childEdges.length / 2 + 0.5) * 250;
          const childY = y + 180;
          queue.push({ nodeId: edge.target, x: childX, y: childY, level: level + 1 });
        }
      });
    }

    if (iterations >= maxIterations) {
      debugWarn('AnimatedScriptViewEnhanced', 'Layout exceeded max iterations', { maxIterations });
    }

    const result = nodes.map(node => ({
      ...node,
      x: positioned[node.id]?.x || 0,
      y: positioned[node.id]?.y || 0,
    }));

    debugTrace('AnimatedScriptViewEnhanced', 'layout_complete', {
      nodeCount: nodes.length,
      iterations,
      duration: perf.getDuration(),
    });

    perf.end();
    return result;
  }, [nodes, edges]);

  // Handle canvas zoom
  const handleCanvasZoom = (direction) => {
    setCanvasZoom(prev => {
      const newZoom = direction === 'in' ? prev + 10 : prev - 10;
      return Math.max(30, Math.min(200, newZoom));
    });
  };

  // Handle canvas scroll
  const handleCanvasScroll = (direction) => {
    setCanvasOffset(prev => ({
      ...prev,
      y: direction === 'up' ? prev.y - 80 : prev.y + 80
    }));
  };

  // Handle canvas pan (drag)
  const handleCanvasMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startOffset = { ...canvasOffset };

    const handleMouseMove = (moveE) => {
      const deltaX = moveE.clientX - startX;
      const deltaY = moveE.clientY - startY;
      setCanvasOffset({
        x: startOffset.x + deltaX,
        y: startOffset.y + deltaY
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Flowchart Background Canvas */}
      <div
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={handleCanvasMouseDown}
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          style={{
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom / 100})`,
            transformOrigin: 'top left',
            transition: 'transform 0.1s ease-out',
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="rgba(148, 163, 184, 0.3)" />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#818cf8" />
            </marker>
          </defs>

          {/* Draw edges/connections */}
          {edges.map((edge, idx) => {
            const source = layoutNodes.find(n => n.id === edge.source);
            const target = layoutNodes.find(n => n.id === edge.target);
            
            if (!source || !target) return null;

            const isInPath = path.includes(edge.source) && path.includes(edge.target);
            const strokeColor = isInPath ? '#818cf8' : 'rgba(148, 163, 184, 0.2)';
            const strokeWidth = isInPath ? 3 : 2;
            const markerUrl = isInPath ? 'url(#arrowhead-active)' : 'url(#arrowhead)';

            return (
              <line
                key={`edge-${idx}`}
                x1={source.x + 100}
                y1={source.y + 60}
                x2={target.x + 100}
                y2={target.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                markerEnd={markerUrl}
                className="transition-all duration-300"
              />
            );
          })}

          {/* Draw nodes */}
          {layoutNodes.map((node) => {
            const isInPath = path.includes(node.id);
            const isCurrentNode = node.id === currentNodeId;
            const isNextOption = !isInPath && nextPossibleNodes.some(n => n.id === node.id);

            const fillColor = isCurrentNode 
              ? '#4f46e5' 
              : isInPath 
              ? '#6366f1'
              : isNextOption
              ? '#8b5cf6'
              : '#64748b';

            const textContent = node.data?.text || '';
            const truncated = textContent.length > 30 
              ? textContent.substring(0, 27) + '...' 
              : textContent;

            return (
              <g key={`node-${node.id}`}>
                {/* Node circle */}
                <circle
                  cx={node.x + 100}
                  cy={node.y + 30}
                  r={30}
                  fill={fillColor}
                  opacity={isCurrentNode ? 1 : isInPath ? 0.8 : 0.6}
                  className="transition-all duration-300 cursor-pointer hover:opacity-100"
                  style={{
                    filter: isCurrentNode ? 'drop-shadow(0 0 12px #4f46e5)' : 'none'
                  }}
                />

                {/* Node label */}
                <text
                  x={node.x + 100}
                  y={node.y + 35}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="12"
                  fill="white"
                  fontWeight="bold"
                  pointerEvents="none"
                  className="select-none"
                >
                  {node.data?.speaker?.charAt(0).toUpperCase() || '?'}
                </text>

                {/* Node label tooltip (shows on hover) */}
                <title>{truncated}</title>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Left Control Panel - Canvas Controls */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 bg-black/50 backdrop-blur border border-purple-500/50 rounded-lg p-2">
        <button
          onClick={() => handleCanvasZoom('in')}
          className="bg-purple-600/80 hover:bg-purple-700 text-white p-2 rounded transition text-xs"
          title="Zoom In Canvas"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => handleCanvasZoom('out')}
          className="bg-purple-600/80 hover:bg-purple-700 text-white p-2 rounded transition text-xs"
          title="Zoom Out Canvas"
        >
          <ZoomOut size={18} />
        </button>
        <div className="h-px bg-purple-400/30"></div>
        <button
          onClick={() => handleCanvasScroll('up')}
          className="bg-purple-600/80 hover:bg-purple-700 text-white p-2 rounded transition text-xs"
          title="Scroll Canvas Up"
        >
          <ChevronUp size={18} />
        </button>
        <button
          onClick={() => handleCanvasScroll('down')}
          className="bg-purple-600/80 hover:bg-purple-700 text-white p-2 rounded transition text-xs"
          title="Scroll Canvas Down"
        >
          <ChevronDown size={18} />
        </button>
        <div className="text-white text-xs text-center font-bold bg-purple-900/60 px-1 py-1 rounded whitespace-nowrap">
          {canvasZoom}%
        </div>
      </div>

      {/* Top gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-900 via-gray-900 to-transparent z-10 pointer-events-none" />

      {/* Main scrollable content - Foreground conversation */}
      <div
        ref={containerRef}
        className="relative flex-grow overflow-y-auto scroll-smooth z-20"
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        <div
          ref={contentRef}
          className="relative flex flex-col items-center py-24 gap-8 px-4"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: isAnimating
              ? `transform ${getAnimationDuration()}ms ease-in-out`
              : 'none',
          }}
        >
          {/* Conversation history - Foreground */}
          {getVisibleNodes.map((node, idx) => {
            if (!node) return null;

            const nodeId = node.id;
            const isInPath = path.includes(nodeId);
            const isCurrentNode = nodeId === currentNodeId;
            const isNextOption = !isInPath && nextPossibleNodes.some(n => n.id === nodeId);
            const isYourTurn = node.data?.speaker === 'You';

            return (
              <div
                key={nodeId}
                data-node-id={nodeId}
                className={`transition-all duration-500 transform max-w-2xl ${
                  !isInPath && !isCurrentNode ? 'opacity-60 scale-95' : 'opacity-100 scale-100'
                } ${isCurrentNode ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-900' : ''}`}
                onClick={() => {
                  if (isNextOption && !isFrozen && !isRecording) {
                    onNodeClick(nodeId);
                  }
                }}
                style={{
                  cursor: isNextOption ? 'pointer' : 'default',
                  animation: idx === getVisibleNodes.length - 1 && isCurrentNode
                    ? `slideUp ${getAnimationDuration()}ms ease-in-out`
                    : 'none',
                }}
              >
                <div className={`rounded-lg p-6 backdrop-blur ${
                  isYourTurn 
                    ? 'bg-blue-500/20 border border-blue-400/50' 
                    : 'bg-white/10 border border-white/20'
                } ${
                  isCurrentNode ? 'ring-2 ring-indigo-400' : ''
                } ${
                  isNextOption && !isInPath ? 'hover:bg-purple-500/30 cursor-pointer' : ''
                }`}>
                  <p className={`text-sm font-bold mb-2 ${isYourTurn ? 'text-blue-300' : 'text-green-300'}`}>
                    {node.data?.speaker?.toUpperCase()}
                  </p>
                  {isEditing && isCurrentNode ? (
                    <textarea
                      value={node.data?.text || ''}
                      onChange={(e) => onTextChange(e, nodeId)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-lg leading-relaxed text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                      rows={2}
                    />
                  ) : (
                    <p className="text-xl leading-relaxed text-white">
                      {node.data?.text}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* End of script indicator */}
          {path.length > 0 && nextPossibleNodes.length === 0 && !isRecording && (
            <div className="mt-8 text-center">
              <p className="text-gray-400 text-sm mb-4">End of Script</p>
              <div className="inline-block px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg text-white font-semibold">
                Practice Complete
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent z-10 pointer-events-none" />

      {/* Animation keyframes */}
      <style>{`
        @keyframes slideUp {
          0% {
            opacity: 0;
            transform: translateY(40px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateY(-40px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInScale {
          0% {
            opacity: 0;
            scale: 0.95;
          }
          100% {
            opacity: 1;
            scale: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedScriptViewEnhanced;