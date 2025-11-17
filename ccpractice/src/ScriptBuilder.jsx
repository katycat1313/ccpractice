import React from 'react';
import { Plus, GitBranch, MessageSquare, Zap } from 'lucide-react';

export default function ScriptBuilder({
  scriptName, setScriptName,
  scriptNodes,
  selectedNodeId, setSelectedNodeId,
  addNode,
  updateNode,
  addBranchToNode,
  updateBranch,
  saveScript,
  setBuilderMode,
  setPage,
  enhanceNodeWithAI,
  isEnhancing,
}) {
  const currentNode = scriptNodes.find(n => n.id === selectedNodeId);

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Script Builder</h1>
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <input type="text" value={scriptName} onChange={(e) => setScriptName(e.target.value)} placeholder="Script name" className="w-full px-3 py-2 border rounded mb-4" />
          <button onClick={addNode} className="w-full bg-blue-600 text-white font-semibold py-2 rounded mb-4">Add Node</button>
          <button onClick={saveScript} className="w-full bg-indigo-600 text-white font-semibold py-2 rounded mb-2">Save</button>
          <button onClick={() => { setBuilderMode(null); setPage('dashboard'); }} className="w-full bg-gray-300 text-gray-800 font-semibold py-2 rounded">Cancel</button>
        </div>

        <div className="col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4">Nodes</h2>
          <div className="space-y-2">
            {scriptNodes.map((node, idx) => (
              <button key={node.id} onClick={() => setSelectedNodeId(node.id)} className={`w-full text-left p-3 rounded ${selectedNodeId === node.id ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>
                {idx + 1}. {node.content.substring(0, 40) || 'Empty'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {currentNode ? (
            <>
              <label className="block text-sm font-semibold mb-2">Your Line</label>
              <div className="relative">
                <textarea value={currentNode.content} onChange={(e) => updateNode(selectedNodeId, e.target.value)} placeholder="What you say..." className="w-full px-3 py-2 border rounded h-32 text-sm pr-10" />
                <button onClick={() => enhanceNodeWithAI(selectedNodeId, currentNode.content)} disabled={isEnhancing} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-purple-600 disabled:opacity-50">
                  <Zap size={16} />
                </button>
              </div>
              
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold">Branches</h4>
                  <button onClick={() => addBranchToNode(selectedNodeId)} className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold flex items-center gap-1">
                    <Plus size={14} /> Add Branch
                  </button>
                </div>
                <div className="space-y-3">
                  {currentNode.branches.map(branch => (
                    <div key={branch.id} className="bg-gray-50 p-3 rounded border">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare size={14} className="text-gray-500" />
                        <input 
                          type="text" 
                          value={branch.condition}
                          onChange={(e) => updateBranch(selectedNodeId, branch.id, { condition: e.target.value })}
                          className="w-full text-sm bg-transparent focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <GitBranch size={14} className="text-gray-500" />
                        <select value={branch.nextNodeId || ''} onChange={(e) => updateBranch(selectedNodeId, branch.id, { nextNodeId: e.target.value ? parseInt(e.target.value) : null })} className="w-full text-sm bg-transparent focus:outline-none text-gray-700">
                          <option value="">-- Link to Node --</option>
                          {scriptNodes.map((node, idx) => (<option key={node.id} value={node.id}>{idx + 1}. {node.content.substring(0, 30)}...</option>))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : <p className="text-gray-600 text-sm">Select a node</p>}
        </div>
      </div>
    </div>
  );
}