import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import PracticeOptionsModal from './PracticeOptionsModal';
import { Save, Play, Trash2, CheckCircle2, User, Users } from 'lucide-react';
import { supabase } from '../../supabaseClient.js';
import { getUser } from '../lib/supabaseAuth';
import { useNavigate } from 'react-router-dom';

// Define nodeTypes outside component to prevent recreation
const nodeTypes = {
  script: ScriptNode,
};

let id = 1;
const getId = () => `${id++}`;

const ScriptBuilder = ({ script, setScript }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [scriptName, setScriptName] = useState('New Script');
  const [menu, setMenu] = useState(null); // Right-click context menu
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const navigate = useNavigate();

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((connection) => setEdges((eds) => addEdge(connection, eds)), []);

  const addNode = useCallback((parentNodeId, parentNodePosition) => {
    const newNodeId = getId();

    // Count existing children to calculate horizontal position
    const existingChildren = edges.filter(e => e.source === parentNodeId).length;

    const horizontalSpacing = 350; // Space between siblings
    const verticalSpacing = 220;

    // Spread siblings horizontally from parent
    const childX = parentNodePosition.x + (existingChildren * horizontalSpacing) - (existingChildren > 0 ? horizontalSpacing / 2 : 0);
    const childY = parentNodePosition.y + verticalSpacing;

    const newNode = {
      id: newNodeId,
      type: 'script',
      position: {
        x: childX,
        y: childY,
      },
      data: {
        text: 'New line...',
        speaker: 'You',
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
  }, [edges]);

  const deleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setMenu(null);
  }, []);

  const updateNodeSpeaker = useCallback((nodeId) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const newSpeaker = node.data.speaker === 'You' ? 'Prospect' : 'You';
          return {
            ...node,
            data: {
              ...node.data,
              speaker: newSpeaker,
            },
          };
        }
        return node;
      })
    );
    setMenu(null);
  }, []);

  const nodesWithAddFunction = useMemo(() => {
    if (!script || !script.nodes) return null;
    return script.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        addNode: (nodeId, position) => addNode(nodeId, position), // Pass addNode function (matches Node.jsx expectation)
      }
    }));
  }, [script?.id, script?.name, addNode]);

  const initialNodes = useMemo(() => {
    if (nodesWithAddFunction) {
      return nodesWithAddFunction;
    }
    const initialNodeId = getId();
    return [
      {
        id: initialNodeId,
        type: 'script',
        position: { x: window.innerWidth / 2 - 150, y: 50 },
        data: {
          text: 'Start your script here...',
          addNode: (nodeId, position) => addNode(nodeId, position), // Add function to initial node too!
        },
      },
    ];
  }, [nodesWithAddFunction, addNode]);

  useEffect(() => {
    if (script && script.nodes) {
      setNodes(initialNodes);
      setEdges(script.edges || []);
      setScriptName(script.name || 'New Script');
    } else {
      setNodes(initialNodes);
      setEdges([]);
      setScriptName('New Script');
    }
  }, [initialNodes]);

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
      setTimeout(() => navigate('/login'), 800);
      return;
    }

    const payload = {
      name: scriptName,
      nodes,
      edges,
      metadata: script?.metadata || { difficulty: undefined },
    };

    let response;
    if (script && script.id) {
      response = await supabase
        .from('scripts')
        .update(payload)
        .eq('id', script.id)
        .select();
    } else {
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
      setScript(data[0]);
      setSaveStatus('saved');
    }

    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleStartPractice = (options) => {
    setScript({ 
      ...script, 
      nodes, 
      edges, 
      metadata: { ...script?.metadata, difficulty: options.difficulty, prospect: options.prospect } 
    });
    setIsPracticeModalOpen(false);
    navigate('/practice');
  };

  return (
    <div className="w-full h-screen flex flex-col">
      <Navbar />
      <div className="bg-white shadow-md p-2 flex items-center justify-between z-10">
        <div className="flex items-center">
          <label htmlFor="scriptName" className="text-sm font-medium text-gray-500 mr-2">Script Name:</label>
          <input
            id="scriptName"
            type="text"
            value={scriptName}
            onChange={(e) => setScriptName(e.target.value)}
            className="font-bold text-lg border-transparent focus:ring-0 focus:border-transparent bg-transparent"
            aria-label="Script Name"
          />
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSave} 
            className={`flex items-center gap-2 text-white py-2 px-4 rounded-md transition-colors ${
              saveStatus === 'saved' 
                ? 'bg-green-600' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saved' ? (
              <>
                <CheckCircle2 size={18} /> Saved!
              </>
            ) : saveStatus === 'saving' ? (
              <>
                <Save size={18} /> Saving…
              </>
            ) : (
              <>
                <Save size={18} /> Save Script
              </>
            )}
          </button>
          <button onClick={() => setIsPracticeModalOpen(true)} className="flex items-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
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
                onClick={() => updateNodeSpeaker(menu.id)}
                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Users size={18} />
                Change Speaker
              </button>
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
      {isPracticeModalOpen && (
        <PracticeOptionsModal
          onStart={handleStartPractice}
          onClose={() => setIsPracticeModalOpen(false)}
        />
      )}
    </div>
  );
};

export default function ScriptBuilderPageWrapper({ script, setScript }) {
  return (
    <ReactFlowProvider>
      <ScriptBuilder script={script} setScript={setScript} />
    </ReactFlowProvider>
  );
}
