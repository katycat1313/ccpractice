import React, { useEffect, useRef, useState } from 'react';
import { debugLog, debugError, debugWarn, debugTrace, validateProps } from '../lib/debugUtils';

const PrompterLine = ({ node, isCurrent, isEditing, onTextChange, onClick, isChoice }) => {
  // Validate props on mount
  useEffect(() => {
    const validation = validateProps('PrompterLine', {
      node, isCurrent, isEditing, onTextChange, onClick, isChoice,
    }, ['node', 'isCurrent', 'isEditing', 'onTextChange', 'onClick', 'isChoice']);
    
    if (!validation.isValid) {
      debugError('PrompterLine', 'Props validation failed', null, validation);
    }
  }, []);

  // Validate node structure
  useEffect(() => {
    if (!node || !node.id || !node.data) {
      debugError('PrompterLine', 'Invalid node structure', null, { node });
    }
    if (!node.data.speaker || !node.data.text) {
      debugWarn('PrompterLine', 'Node missing speaker or text', { nodeId: node?.id });
    }
  }, [node]);
  const ref = useRef(null);
  const [isClicked, setIsClicked] = useState(false);
  const isYourTurn = node.data.speaker === 'You';

  useEffect(() => {
    if (isCurrent) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCurrent]);

  const handleClick = () => {
    try {
      debugTrace('PrompterLine', 'clicked', { 
        nodeId: node.id,
        isChoice,
        isCurrent,
      });

      if (isChoice) {
        setIsClicked(true);
        // Reset the click state after animation
        setTimeout(() => setIsClicked(false), 600);
      }
      onClick?.();
    } catch (err) {
      debugError('PrompterLine', 'Error in handleClick', err);
    }
  };

  const speakerColor = isYourTurn ? 'text-blue-400' : 'text-green-400';
  const bgColor = isCurrent 
    ? 'bg-gray-800 ring-2 ring-indigo-500' 
    : isClicked 
    ? 'bg-purple-700 ring-2 ring-purple-400' 
    : 'bg-transparent';
  const cursor = isChoice ? 'cursor-pointer hover:bg-gray-700 active:scale-95' : '';
  const borderClass = isCurrent ? 'border-l-4 border-indigo-500' : isClicked ? 'border-l-4 border-purple-400' : '';

  return (
    <div
      ref={ref}
      onClick={handleClick}
      data-node-id={node.id}
      className={`w-full max-w-4xl rounded-lg p-6 text-center transition-all duration-300 transform ${bgColor} ${cursor} ${borderClass}`}
    >
      <p className={`text-lg font-bold mb-2 ${speakerColor}`}>
        {node.data.speaker?.toUpperCase()}
      </p>
      {isEditing && isCurrent ? (
        <textarea
          value={node.data.text}
          onChange={onTextChange}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-3xl md:text-4xl leading-relaxed text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={3}
        />
      ) : (
        <p className="text-3xl md:text-4xl leading-relaxed">
          {node.data.text}
        </p>
      )}
      {isClicked && (
        <div className="mt-3 text-2xl text-purple-300 animate-pulse">✓</div>
      )}
    </div>
  );
};

export default PrompterLine;
