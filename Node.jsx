import React from 'react';
import './Node.css';
import { Zap } from 'lucide-react';

// A simple sparkle icon for AI enhanced nodes
const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z" />
  </svg>
);

const Node = ({ node, onAiAssistClick, onBranchClick }) => {
  if (!node) {
    return <div>No node data</div>;
  }

  const { turn, content, branches, metadata } = node;
  const isUserTurn = turn === 'user';

  return (
    <div className={`node-card ${isUserTurn ? 'user-node' : 'ai-node'}`}>
      <div className="node-header">
        <span>{isUserTurn ? 'Your Line' : 'AI Response'}</span>
        <div className="node-actions">
          {metadata.aiEnhanced && (
            <div className="ai-enhanced-badge" title="AI Enhanced">
              <SparkleIcon />
            </div>
          )}
          <button className="ai-assist-button" title="AI Assist" onClick={() => onAiAssistClick(node.id)}>
            <Zap size={16} />
          </button>
        </div>
      </div>
      <div className="node-content">
        <p>{content}</p>
      </div>
      <div className="node-footer">
        <div className="metadata-info">
          <span>Tone: {metadata.tone}</span>
        </div>
        <div className="branches">
          {branches.map(branch => (
            <button key={branch.id} onClick={() => onBranchClick(branch.targetNodeId)}>{branch.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Node;
