import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Play, Pause, Edit, Check, SkipForward, RotateCcw, Mic, StopCircle, X } from 'lucide-react';
import PrompterLine from '../components/PrompterLine';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function PracticePage({ script, setScript, setFeedback, setTranscript, onClose }) {
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [path, setPath] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const currentLineRef = useRef(null);
  const navigate = useNavigate();

  const { nodes, edges, metadata } = script || { nodes: [], edges: [], metadata: {} };
  const difficulty = metadata?.difficulty || 'Medium';

  const handleRestart = useCallback(() => {
    if (nodes.length > 0) {
      const rootNode = nodes.find(n => !edges.some(e => e.target === n.id)) || nodes[0];
      setCurrentNodeId(rootNode.id);
      setPath([rootNode.id]);
      setIsPaused(true);
    }
  }, [nodes, edges]);

  useEffect(() => {
    handleRestart();
  }, [handleRestart]);

  useEffect(() => {
    if (currentLineRef.current) {
      currentLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentNodeId]);

  const nextPossibleNodes = useMemo(() => {
    if (!currentNodeId) return [];
    return edges
      .filter(e => e.source === currentNodeId)
      .map(e => nodes.find(n => n.id === e.target))
      .filter(Boolean);
  }, [currentNodeId, nodes, edges]);

  const handleTextChange = (e, nodeId) => {
    const newText = e.target.value;
    const newNodes = nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, text: newText } };
      }
      return node;
    });
    setScript({ ...script, nodes: newNodes });
  };

  const handleNodeClick = (nodeId) => {
    const currentIndexInPath = path.indexOf(nodeId);
    if (currentIndexInPath > -1 && currentIndexInPath < path.length - 1) {
      setPath(path.slice(0, currentIndexInPath + 1));
      setCurrentNodeId(nodeId);
      return;
    }
    if (nextPossibleNodes.some(n => n.id === nodeId)) {
      const newPath = [...path, nodeId];
      setPath(newPath);
      setCurrentNodeId(nodeId);
    }
  };

  const handleSkip = useCallback(() => {
    if (nextPossibleNodes.length > 0) {
      handleNodeClick(nextPossibleNodes[0].id);
    }
  }, [nextPossibleNodes, handleNodeClick]);

  useEffect(() => {
    let interval;
    if (!isPaused) {
      interval = setInterval(() => {
        handleSkip();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPaused, handleSkip]);

  const handleStartRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    mediaRecorder.current.ondataavailable = (event) => {
      audioChunks.current.push(event.data);
    };
    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    mediaRecorder.current.stop();
    mediaRecorder.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
      audioChunks.current = [];
      
      const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke('speech-to-text', {
        body: audioBlob,
        headers: { 'Content-Type': 'audio/webm' },
      });

      if (transcriptError) {
        console.error('Speech-to-text error:', transcriptError);
        return;
      }

      setTranscript(transcriptData.transcript);

      const scriptText = nodes.map(node => node.data.text).join(' ');
      const { data: feedbackData, error: feedbackError } = await supabase.functions.invoke('generate-feedback', {
        body: {
          transcript: transcriptData.transcript,
          script: scriptText,
        },
      });

      if (feedbackError) {
        console.error('Feedback generation error:', feedbackError);
        return;
      }

      setFeedback(feedbackData);
    };
    setIsRecording(false);
  };

  const progress = path.length > 0 && nodes.length > 0 ? (path.length / nodes.length) * 100 : 0;

  if (nodes.length === 0) {
    // This part is less likely to be hit now, but good to keep as a fallback.
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
        <div className="bg-gray-800 text-white rounded-lg shadow-2xl p-8 w-full max-w-md text-center">
          <h1 className="text-3xl font-bold mb-4">No Script Loaded</h1>
          <p className="text-gray-400 mb-8">You need to select a script to practice. Please go to your dashboard to choose one.</p>
          <button onClick={onClose} className="bg-indigo-600 px-6 py-3 rounded-md font-semibold hover:bg-indigo-700 transition-colors">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 font-open-dyslexic">
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <div className="text-center">
                <span className="text-sm uppercase tracking-widest text-gray-400">Difficulty</span>
                <p className="text-xl font-bold text-yellow-400">{difficulty}</p>
            </div>
            <h2 className="text-2xl font-bold text-white">Practice Session</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X size={28} />
            </button>
        </div>

        <div className="relative flex-grow flex flex-col items-center pt-8 pb-32 overflow-y-auto">
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-900 to-transparent z-10 pointer-events-none" />
          
          <div className="w-full flex flex-col items-center gap-8 px-4">
            {path.map(nodeId => {
              const node = nodes.find(n => n.id === nodeId);
              if (!node) return null;
              return (
                <PrompterLine 
                  ref={node.id === currentNodeId ? currentLineRef : null}
                  key={node.id}
                  node={node}
                  isCurrent={node.id === currentNodeId}
                  isEditing={isEditing}
                  onTextChange={(e) => handleTextChange(e, node.id)}
                  onClick={() => handleNodeClick(node.id)}
                  isChoice={path.indexOf(node.id) < path.length - 1}
                />
              );
            })}
            
            {nextPossibleNodes.length > 0 && (
              <div className="mt-4 w-full max-w-4xl border-t-2 border-gray-700 pt-8 flex flex-col items-center gap-4">
                <p className="text-gray-400 mb-4">Choose the next path:</p>
                {nextPossibleNodes.map(nextNode => (
                  <PrompterLine 
                    key={nextNode.id}
                    node={nextNode}
                    isCurrent={false}
                    isEditing={false}
                    onTextChange={() => {}}
                    onClick={() => handleNodeClick(nextNode.id)}
                    isChoice={true}
                  />
                ))}
              </div>
            )}

            {nextPossibleNodes.length === 0 && (
              <div className="mt-8">
                <button onClick={() => {
                  if (isRecording) {
                    handleStopRecording();
                  }
                  onClose(); // Close the modal
                  navigate('/feedback');
                }} className="bg-green-600 text-white font-semibold py-3 px-6 rounded-lg">
                  End of Script - Finish Practice
                </button>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-900 to-transparent z-10 pointer-events-none" />
        </div>

        <div className="bg-black bg-opacity-50 mt-auto z-20">
          <div className="w-full bg-gray-700 h-1">
            <div className="bg-indigo-500 h-1" style={{ width: `${progress}%` }} />
          </div>
          <div className="p-4 flex justify-center items-center gap-8">
            <button onClick={handleRestart} className="flex items-center gap-2 text-gray-300 hover:text-white" title="Restart Script" aria-label="Restart Script">
              <RotateCcw size={20} /> Restart
            </button>
            <button onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-2 text-gray-300 hover:text-white" title={isEditing ? "Save Changes" : "Edit Script"} aria-label={isEditing ? "Save Changes" : "Edit Script"}>
              {isEditing ? <><Check size={20} /> Save</> : <><Edit size={20} /> Edit</>}
            </button>
            <button onClick={() => setIsPaused(!isPaused)} className="bg-white text-gray-900 p-4 rounded-full shadow-lg transform hover:scale-110 transition-transform" title={isPaused ? "Start Practice" : "Pause Practice"} aria-label={isPaused ? "Start Practice" : "Pause Practice"}>
              {isPaused ? <Play size={28} className="ml-1" /> : <Pause size={28} />}
            </button>
            <button onClick={handleSkip} className="flex items-center gap-2 text-gray-300 hover:text-white" title="Skip to Next Line" aria-label="Skip to Next Line">
              <SkipForward size={20} /> Skip
            </button>
            <button onClick={isRecording ? handleStopRecording : handleStartRecording} className="flex items-center gap-2 text-red-500 hover:text-red-400" title={isRecording ? "Stop Recording" : "Start Recording"} aria-label={isRecording ? "Stop Recording" : "Start Recording"}>
              {isRecording ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                  <StopCircle size={20} /> Stop
                </>
              ) : (
                <><Mic size={20} /> Record</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
