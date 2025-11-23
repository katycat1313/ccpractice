import React, { useEffect, useRef, useState, useMemo } from 'react';
import PrompterLine from './PrompterLine';
import { debugLog, debugError, debugWarn, debugTrace, validateProps, PerformanceTracker } from '../lib/debugUtils';

const AnimatedScriptView = ({
  nodes,
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
    const validation = validateProps('AnimatedScriptView', {
      nodes, path, nextPossibleNodes, currentNodeId,
      isRecording, isFrozen, isEditing, playbackSpeed,
      zoom, onNodeClick, onTextChange,
    }, [
      'nodes', 'path', 'nextPossibleNodes', 'currentNodeId',
      'isRecording', 'isFrozen', 'isEditing', 'playbackSpeed',
      'zoom', 'onNodeClick', 'onTextChange',
    ]);
    
    if (!validation.isValid) {
      debugError('AnimatedScriptView', 'Props validation failed', null, validation);
    }
  }, []);

  // Validate array types
  useEffect(() => {
    if (!Array.isArray(nodes)) {
      debugWarn('AnimatedScriptView', 'nodes is not an array', { type: typeof nodes });
    }
    if (!Array.isArray(path)) {
      debugWarn('AnimatedScriptView', 'path is not an array', { type: typeof path });
    }
    if (!Array.isArray(nextPossibleNodes)) {
      debugWarn('AnimatedScriptView', 'nextPossibleNodes is not an array', { type: typeof nextPossibleNodes });
    }
  }, [nodes, path, nextPossibleNodes]);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [animationQueue, setAnimationQueue] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate animation duration based on playback speed
  // At 1x speed: 800ms per scroll transition
  // At 1.5x speed: 533ms (faster)
  // At 0.75x speed: 1066ms (slower)
  const getAnimationDuration = () => {
    if (!playbackSpeed || playbackSpeed <= 0) {
      debugWarn('AnimatedScriptView', 'Invalid playbackSpeed', { playbackSpeed });
      return 800; // Fallback to default
    }
    const duration = Math.round(800 / playbackSpeed);
    if (duration < 100 || duration > 5000) {
      debugWarn('AnimatedScriptView', 'Animation duration out of expected range', { duration });
    }
    return duration;
  };

  // When path changes, queue up a new animation
  useEffect(() => {
    if (path.length > 0 && !isAnimating) {
      const lastNodeId = path[path.length - 1];
      debugTrace('AnimatedScriptView', 'path_changed', { 
        pathLength: path.length, 
        lastNodeId,
        isAnimating,
      });
      setAnimationQueue(prev => [...prev, lastNodeId]);
    }
  }, [path, isAnimating]);

  // Process animation queue
  useEffect(() => {
    if (animationQueue.length === 0 || isAnimating) return;

    setIsAnimating(true);
    const duration = getAnimationDuration();

    debugTrace('AnimatedScriptView', 'animation_start', {
      queueLength: animationQueue.length,
      duration,
      currentNodeId,
    });

    // Trigger scroll animation
    const timer = setTimeout(() => {
      try {
        // Scroll to center the new current line
        const currentElement = contentRef.current?.querySelector(
          `[data-node-id="${currentNodeId}"]`
        );
        
        if (!currentElement) {
          debugWarn('AnimatedScriptView', 'Could not find element to scroll to', {
            currentNodeId,
            availableElements: contentRef.current?.querySelectorAll('[data-node-id]').length || 0,
          });
        } else {
          currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          debugTrace('AnimatedScriptView', 'scroll_completed', { currentNodeId });
        }

        // Remove processed item from queue
        setAnimationQueue(prev => {
          const newQueue = prev.slice(1);
          debugTrace('AnimatedScriptView', 'animation_queue_updated', { 
            queueLength: newQueue.length,
          });
          return newQueue;
        });
        setIsAnimating(false);
      } catch (err) {
        debugError('AnimatedScriptView', 'Error during animation', err);
        setIsAnimating(false);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [animationQueue, isAnimating, currentNodeId, playbackSpeed]);

  // Get visible nodes with proper context
  const getVisibleNodes = useMemo(() => {
    try {
      if (path.length === 0) return [];

      const pathNodeIds = path;
      const visibleNodeIds = [...pathNodeIds];

      // Add next possible options if not recording/frozen
      if (!isRecording && !isFrozen && nextPossibleNodes.length > 0) {
        nextPossibleNodes.forEach(node => {
          if (!node || !node.id) {
            debugWarn('AnimatedScriptView', 'Invalid node in nextPossibleNodes', { node });
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

      debugTrace('AnimatedScriptView', 'visible_nodes_updated', {
        visibleCount: visibleNodes.length,
        pathCount: pathNodeIds.length,
        nextOptionsCount: nextPossibleNodes.length,
      });

      return visibleNodes;
    } catch (err) {
      debugError('AnimatedScriptView', 'Error calculating visible nodes', err);
      return [];
    }
  }, [path, nodes, nextPossibleNodes, isRecording, isFrozen]);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Top gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-900 via-gray-900 to-transparent z-10 pointer-events-none" />

      {/* Main scrollable content */}
      <div
        ref={containerRef}
        className="relative flex-grow overflow-y-auto scroll-smooth"
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
          {/* Conversation history */}
          {getVisibleNodes.map((node, idx) => {
            if (!node) return null;

            const nodeId = node.id;
            const isInPath = path.includes(nodeId);
            const isCurrentNode = nodeId === currentNodeId;
            const isNextOption = !isInPath && nextPossibleNodes.some(n => n.id === nodeId);

            return (
              <div
                key={nodeId}
                data-node-id={nodeId}
                className={`transition-all duration-500 transform ${
                  !isInPath && !isCurrentNode ? 'opacity-60 scale-95' : 'opacity-100 scale-100'
                } ${isCurrentNode ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-900' : ''}`}
                style={{
                  animation:
                    idx === getVisibleNodes.length - 1 && isCurrentNode
                      ? `slideUp ${getAnimationDuration()}ms ease-in-out`
                      : 'none',
                }}
              >
                <PrompterLine
                  node={node}
                  isCurrent={isCurrentNode}
                  isEditing={isEditing && isCurrentNode}
                  onTextChange={(e) => onTextChange(e, nodeId)}
                  onClick={() => {
                    if (isNextOption && !isFrozen && !isRecording) {
                      onNodeClick(nodeId);
                    }
                  }}
                  isChoice={isNextOption}
                />
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

export default AnimatedScriptView;
