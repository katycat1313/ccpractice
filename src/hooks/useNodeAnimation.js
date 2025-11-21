import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * useNodeAnimation
 * 
 * Manages vertical scrolling animation for conversation nodes
 * Handles bottom-to-top flow with smooth transitions
 * 
 * Usage:
 * const { animateNodeEntry, setScrollSpeed, containerRef } = useNodeAnimation();
 */

export const useNodeAnimation = () => {
  const [scrollSpeed, setScrollSpeed] = useState(3000); // ms
  const [isAnimating, setIsAnimating] = useState(false);
  const [visibleNodes, setVisibleNodes] = useState([]);
  
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const nodeQueueRef = useRef([]);
  const animationStateRef = useRef({
    startTime: null,
    duration: null,
    startPos: 0,
    endPos: 0,
  });

  /**
   * Smoothly scroll container to show new node at bottom
   */
  const animateNodeEntry = useCallback((nodeId, duration = scrollSpeed) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const targetScroll = container.scrollHeight - container.clientHeight;

    // Animate scroll
    const startScroll = container.scrollTop;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: ease-out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      container.scrollTop = startScroll + (targetScroll - startScroll) * easeProgress;

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animate();
  }, [scrollSpeed]);

  /**
   * Queue a node for animation entry
   */
  const queueNodeAnimation = useCallback(
    (nodeId) => {
      nodeQueueRef.current.push(nodeId);
      console.log('[Animation] Queued node:', nodeId);
    },
    []
  );

  /**
   * Process queued nodes with staggered timing
   */
  const processNodeQueue = useCallback(() => {
    if (nodeQueueRef.current.length === 0) return;

    const nodeId = nodeQueueRef.current.shift();
    setVisibleNodes(prev => [...prev, nodeId]);

    // Animate this node, then process next
    animateNodeEntry(nodeId, scrollSpeed);

    // Queue next node processing
    if (nodeQueueRef.current.length > 0) {
      setTimeout(() => {
        processNodeQueue();
      }, scrollSpeed / 2); // Stagger entries
    }
  }, [animateNodeEntry, scrollSpeed]);

  /**
   * Clear queue and reset
   */
  const reset = useCallback(() => {
    nodeQueueRef.current = [];
    setVisibleNodes([]);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  /**
   * Scroll to current node (immediate, no animation)
   */
  const scrollToNode = useCallback((nodeId) => {
    if (!containerRef.current) return;

    const nodeElement = containerRef.current.querySelector(`[data-node-id="${nodeId}"]`);
    if (nodeElement) {
      nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  /**
   * Zoom in/out
   */
  const setZoom = useCallback((zoomLevel) => {
    if (containerRef.current) {
      containerRef.current.style.transform = `scale(${zoomLevel / 100})`;
      containerRef.current.style.transformOrigin = 'top center';
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    animateNodeEntry,
    queueNodeAnimation,
    processNodeQueue,
    scrollToNode,
    setZoom,
    reset,
    containerRef,
    scrollSpeed,
    setScrollSpeed,
    visibleNodes,
    isAnimating,
  };
};
