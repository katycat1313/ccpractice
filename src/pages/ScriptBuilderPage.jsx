import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  Controls,
} from 'reactflow';
import 'reactflow/dist/style.css';

import Navbar from '../components/Navbar';
import ScriptNode from '../components/Node';
import DifficultyModal from '../components/DifficultyModal'; // Import the new modal
import { Save, Play, Trash2 } from 'lucide-react';
import { supabase } from '../../supabaseClient.js';
import { getUser } from '../lib/supabaseAuth';

const nodeTypes = {
  script: ScriptNode,
};

let id = 1;
const getId = () => `${id++}`;

// This is the main component where the logic resides.
const ScriptBuilder = ({ setPage, activeScript, setActiveScript }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [scriptName, setScriptName] = useState('New Script');
  const [menu, setMenu] = useState(null);
  const [isDifficultyModalOpen, setIsDifficultyModalOpen] = useState(false); // New state for modal
  const [saveStatus, setSaveStatus] = useState(null);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((connection) => setEdges((eds) => addEdge(connection, eds)), []);

  const addNode = useCallback((parentNodeId, parentNodePosition) => {
    const newNodeId = getId();
    const newNode = {
      id: newNodeId,
      type: 'script',
      position: {
        x: parentNodePosition.x,
        y: parentNodePosition.y + 220,
      },
      data: {
        text: 'New line...',
        addNode: (id, pos) => addNode(id, pos),
      },
    };

    const newEdge = {
      id: `e-${parentNodeId}-${newNodeId}`,
      source: parentNodeId,
      target: newNodeId,
      sourceHandle: null,
    };

    setNodes((currentNodes) => currentNodes.concat(newNode));
    setEdges((currentEdges) => currentEdges.concat(newEdge));
  }, []);

  const deleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setMenu(null);
  }, []);

  useEffect(() => {
    const nodesWithAddFunction = (nodesToMap) => {
      return nodesToMap.map(node => ({
        ...node,
        data: {
          ...node.data,
          addNode: (id, pos) => addNode(id, pos),
        }
      }));
    };

    if (activeScript && activeScript.nodes) {
      setNodes(nodesWithAddFunction(activeScript.nodes));
      setEdges(activeScript.edges || []);
    } else {
      const initialNodeId = getId();
      setNodes([
        {
          id: initialNodeId,
          type: 'script',
          position: { x: window.innerWidth / 2 - 150, y: 50 },
          data: {
            text: 'Start your script here...',
            addNode: (id, pos) => addNode(id, pos),
          },
        },
      ]);
      setEdges([]);
    }
  }, [activeScript, addNode]);

  const onNodeContextMenu = (event, node) => {
    event.preventDefault();
    setMenu({
      id: node.id,
      top: event.clientY,
      left: event.clientX,
    });
  };

  const onPaneClick = () => setMenu(null);

  const handleSave = async () => {
    setSaveStatus('saving');
    const u = await getUser();
    const user = u?.data?.user;

    if (!user) {
      setSaveStatus('no-user');
      setTimeout(() => setPage('login'), 800);
      return;
    }

    const payload = {
      name: scriptName,
      nodes,
      edges,
      metadata: activeScript?.metadata || { difficulty: undefined },
    };

    let response;
    if (activeScript && activeScript.id) {
      // Update existing script
      response = await supabase
        .from('scripts')
        .update(payload)
        .eq('id', activeScript.id)
        .select();
    } else {
      // Create new script
      payload.user_id = user.id;
      response = await supabase
        .from('scripts')
        .insert(payload)
        .select();
    }

    const { data, error } = response;

    if (error) {
      console.error('Save error', error);
      setSaveStatus('error');
    } else {
      setActiveScript(data[0]);
      setSaveStatus('saved');
    }

    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleStartPractice = (difficulty) => {
    setActiveScript({ nodes, edges, difficulty });
    setIsDifficultyModalOpen(false);
    setPage('practice');
  };

  return (
    <div className="w-full h-screen flex flex-col">
      <Navbar setPage={setPage} />
      <div className="bg-white shadow-md p-2 flex items-center justify-between z-10">
        <input
          type="text"
          value={scriptName}
          onChange={(e) => setScriptName(e.target.value)}
          className="font-bold text-lg border-transparent focus:ring-0 focus:border-transparent bg-transparent"
        />
          <div className="flex items-center gap-2">
          <button onClick={handleSave} className="flex items-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700">
            <Save size={18} /> {saveStatus === 'saving' ? 'Saving…' : 'Save Script'}
          </button>
          <button onClick={() => setIsDifficultyModalOpen(true)} className="flex items-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
            <Play size={18} /> Practice Script
          </button>
        </div>
      </div>
      <div className="flex-grow">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneClick={onPaneClick}
          onNodeContextMenu={onNodeContextMenu}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gradient-to-br from-gray-50 to-gray-200"
        >
          <Background />
          <Controls />
          {menu && (
            <div
              style={{ top: menu.top, left: menu.left }}
              className="absolute z-50 bg-white shadow-lg rounded-md overflow-hidden"
            >
              <button
                onClick={() => deleteNode(menu.id)}
                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={18} />
                Delete Node
              </button>
            </div>
          )}
        </ReactFlow>
      </div>
      {isDifficultyModalOpen && (
        <DifficultyModal
          onStart={handleStartPractice}
          onClose={() => setIsDifficultyModalOpen(false)}
        />
      )}
    </div>
  );
};

// This wrapper provides the React Flow context to the main component.
export default function ScriptBuilderPageWrapper({ setPage, activeScript, setActiveScript }) {
  return (
    <ReactFlowProvider>
      <ScriptBuilder setPage={setPage} activeScript={activeScript} setActiveScript={setActiveScript} />
    </ReactFlowProvider>
  );
}
