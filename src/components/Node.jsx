import React from 'react';
import { Handle, Position } from 'reactflow';
import './Node.css';
import { PlusCircle } from 'lucide-react';

const ScriptNode = ({ id, data, xPos, yPos }) => {
  const { text, speaker, addNode } = data;

  // Determine node style based on speaker
  const isUserTurn = speaker === 'You';
  const nodeClass = speaker ? (isUserTurn ? 'user-node' : 'ai-node') : 'default-node';

  return (
    <div className={`node-card ${nodeClass}`}>
      {/* Handle for incoming connections */}
      <Handle type="target" position={Position.Top} isConnectable={true} />
      
      <div className="node-header">
        <span>{speaker || 'Script Line'}</span>
      </div>

      <div className="node-content">
        <p>{text || '...'}</p>
      </div>

      {/* Only show the 'add node' button if the function is provided */}
      {addNode && (
        <div className="node-footer">
          <button 
            onClick={() => addNode(id, { x: xPos, y: yPos })}
            className="add-node-button"
            title="Add next node"
          >
            <PlusCircle size={18} />
          </button>
        </div>
      )}

      {/* Handle for outgoing connections */}
      <Handle type="source" position={Position.Bottom} isConnectable={true} />
    </div>
  );
};

export default ScriptNode;