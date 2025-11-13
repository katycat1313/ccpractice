import React, { memo } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Plus, Zap } from 'lucide-react';

// Using memo for performance optimization with React Flow
const ScriptNode = memo(({ id, data, xPos, yPos }) => {
  const { setNodes } = useReactFlow();

  const onTextChange = (evt) => {
    const newText = evt.target.value;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              text: newText,
            },
          };
        }
        return node;
      })
    );
  };

  const isYou = data.speaker === 'You';
  const borderColor = isYou ? 'border-blue-500' : 'border-gray-400';
  const speakerColor = isYou ? 'text-blue-600' : 'text-gray-600';

  return (
    <div className={`p-4 rounded-lg shadow-lg border-2 bg-white w-80 ${borderColor}`}>
      {/* Node Header */}
      <div className="flex justify-between items-center mb-2">
        <span className={`text-xs font-bold ${speakerColor}`}>{data.speaker?.toUpperCase() || 'SPEAKER'}</span>
        <button className="p-1 hover:bg-gray-200 rounded-full" title="Generate with AI">
          <Zap size={16} className="text-purple-600" />
        </button>
      </div>

      {/* Main Content */}
      <textarea
        className="w-full h-28 p-2 border-t border-gray-200 focus:outline-none resize-none text-sm text-gray-800 font-open-dyslexic"
        value={data.text}
        onChange={onTextChange}
        placeholder="Enter script line here..."
      />

      {/* Handles for edges (connections) */}
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-indigo-600" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-green-600" />

      {/* Add Node Button */}
      <div className="flex justify-center mt-2">
        <button
          onClick={() => data.addNode(id, { x: xPos, y: yPos })}
          className="p-1.5 bg-gray-200 hover:bg-blue-500 hover:text-white rounded-full transition-all"
          title="Add a new node below"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
});

export default ScriptNode;
