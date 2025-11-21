import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Play, Pause, Edit, Check, RotateCcw, Mic, StopCircle, X, ZoomIn, ZoomOut, Maximize2, AlertCircle } from 'lucide-react';
import PrompterLine from '../components/PrompterLine';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer';
import { useStreamingTranscription } from '../hooks/useStreamingTranscription';
import { useAIResponseOrchestrator } from '../hooks/useAIResponseOrchestrator';
import { useNodeAnimation } from '../hooks/useNodeAnimation';

export default function PracticePage({ script, setScript, setFeedback, setTranscript, onClose }) {
  // ============= STATE MANAGEMENT =============
  const [isRecording, setIsRecording] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [path, setPath] = useState([]);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sensitivity, setSensitivity] = useState(50);

  // ============= HOOKS =============
  const analyzer = useAudioAnalyzer(
    () => console.log('[PracticePage] Speech ended'),
    () => console.log('[PracticePage] Speech started')
  );
  const transcription = useStreamingTranscription();
  const orchestrator = useAIResponseOrchestrator();
  const animation = useNodeAnimation();

  const navigate = useNavigate();
  const recordingStreamRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const { nodes, edges, metadata } = script || { nodes: [], edges: [], metadata: {} };
  const difficulty = metadata?.difficulty || 'Medium';
  // ============= INITIALIZATION =============
  const handleRestart = useCallback(() => {
    if (nodes.length > 0) {
      const rootNode = nodes.find(n => !edges.some(e => e.target === n.id)) || nodes[0];
      setPath([rootNode.id]);
      setRecordingDuration(0);
      setIsFrozen(false);
      setIsEditing(false);
      setError(null);
      animation.reset();
      orchestrator.reset();
      transcription.reset();
    }
  }, [nodes, edges, animation, orchestrator, transcription]);

  useEffect(() => {
    handleRestart();
  }, [handleRestart]);

  // ============= NODE FLOW LOGIC =============
  const nextPossibleNodes = useMemo(() => {
    if (path.length === 0) return [];
    const currentNodeId = path[path.length - 1];
    return edges
      .filter(e => e.source === currentNodeId)
      .map(e => nodes.find(n => n.id === e.target))
      .filter(Boolean);
  }, [path, nodes, edges]);

  const handleNodeClick = (nodeId) => {
    if (isFrozen) return;

    const currentNodeId = path[path.length - 1];
    if (nextPossibleNodes.some(n => n.id === nodeId)) {
      const newPath = [...path, nodeId];
      setPath(newPath);
      animation.queueNodeAnimation(nodeId);
      animation.processNodeQueue();
    }
  };

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

  // ============= RECORDING MANAGEMENT =============
  const buildConversationHistory = useCallback(() => {
    return path.map(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      return {
        speaker: node.data.speaker,
        text: node.data.text,
      };
    });
  }, [path, nodes]);

  const handleStartRecording = async () => {
    try {
      setError(null);

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;

      // Start all subsystems
      const analyzerStarted = await analyzer.startAnalysis(stream);
      if (!analyzerStarted) {
        setError('Failed to start audio analyzer');
        return;
      }

      await transcription.startStreaming(stream);
      analyzer.setSensitivity(sensitivity);

      // Start orchestration loop
      orchestrator.startOrchestration(
        analyzer,
        buildConversationHistory(),
        difficulty,
        () => {
          console.log('[PracticePage] Response ready!');
        }
      );

      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();

      // Track recording duration
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
      }, 100);

      console.log('[PracticePage] Recording started');
    } catch (err) {
      console.error('[PracticePage] Error starting recording:', err);
      setError(err.message);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      setIsFrozen(true);

      // Stop all subsystems
      analyzer.stopAnalysis();
      orchestrator.stopOrchestration();

      const finalTranscript = await transcription.stopStreaming();
      setTranscript(finalTranscript);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach(track => track.stop());
      }

      console.log('[PracticePage] Recording stopped. Transcript:', finalTranscript);

      // Generate feedback
      const scriptText = nodes.map(node => node.data.text).join(' ');
      const { data: feedbackData, error: feedbackError } = await supabase.functions.invoke(
        'generate-feedback',
        {
          body: {
            transcript: finalTranscript,
            script: scriptText,
          },
        }
      );

      if (feedbackError) {
        console.error('Feedback error:', feedbackError);
      } else {
        setFeedback(feedbackData);
      }
    } catch (err) {
      console.error('[PracticePage] Error stopping recording:', err);
      setError(err.message);
    }
  };

  // ============= AUTO-INJECT PROSPECT RESPONSES =============
  useEffect(() => {
    // Check if response is queued and ready to inject
    if (!isRecording && orchestrator.queuedResponse && !isFrozen) {
      console.log('[PracticePage] Injecting queued response');

      const response = orchestrator.getQueuedResponse();
      if (response) {
        // Create new prospect node
        const newNodeId = String(Math.max(...nodes.map(n => parseInt(n.id))) + 1);
        const newNode = {
          id: newNodeId,
          type: 'script',
          position: { x: 0, y: 0 },
          data: {
            speaker: response.speaker,
            text: response.text,
          },
        };

        // Add to script
        const updatedNodes = [...nodes, newNode];
        setScript({ ...script, nodes: updatedNodes });

        // Advance path and animate
        const newPath = [...path, newNodeId];
        setPath(newPath);

        animation.queueNodeAnimation(newNodeId);
        animation.processNodeQueue();
      }
    }
  }, [orchestrator.queuedResponse, isRecording, isFrozen, path, nodes, script, animation]);

  // ============= UI CALCULATIONS =============
  const progress = path.length > 0 && nodes.length > 0 ? (path.length / nodes.length) * 100 : 0;
  const currentNodeId = path[path.length - 1];

  // ============= RENDER ERROR STATE =============
  if (nodes.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
        <div className="bg-gray-800 text-white rounded-lg shadow-2xl p-8 w-full max-w-md text-center">
          <h1 className="text-3xl font-bold mb-4">No Script Loaded</h1>
          <p className="text-gray-400 mb-8">You need to select a script to practice.</p>
          <button
            onClick={onClose}
            className="bg-indigo-600 px-6 py-3 rounded-md font-semibold hover:bg-indigo-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // ============= MAIN RENDER =============
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 font-open-dyslexic overflow-hidden">
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden">
        {/* ============= HEADER ============= */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="text-center">
            <span className="text-sm uppercase tracking-widest text-gray-400">Difficulty</span>
            <p className="text-xl font-bold text-yellow-400">{difficulty}</p>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Practice Session</h2>
            {isRecording && (
              <p className="text-sm text-red-400 mt-1">
                Recording: {recordingDuration}s
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="text-gray-400 hover:text-white p-2"
              title="Zoom out"
            >
              <ZoomOut size={20} />
            </button>
            <span className="text-xs text-gray-400 w-10 text-center pt-2">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(150, zoom + 10))}
              className="text-gray-400 hover:text-white p-2"
              title="Zoom in"
            >
              <ZoomIn size={20} />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={28} />
            </button>
          </div>
        </div>

        {/* ============= CONTROLS =============  */}
        {isRecording && (
          <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center gap-4">
            <label className="text-sm text-gray-400">Sensitivity:</label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={sensitivity}
              onChange={(e) => {
                setSensitivity(parseInt(e.target.value));
                analyzer.setSensitivity(parseInt(e.target.value));
              }}
              className="w-48"
            />
            <span className="text-xs text-gray-400">{sensitivity}%</span>
            <div className="ml-auto text-xs text-gray-400">
              {transcription.isConnected && (
                <span className="text-green-400">● Streaming</span>
              )}
            </div>
          </div>
        )}

        {/* ============= ERROR MESSAGE ============= */}
        {error && (
          <div className="bg-red-900 bg-opacity-30 border border-red-700 px-4 py-2 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-400" />
            <span className="text-red-200 text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-200"
            >
              ✕
            </button>
          </div>
        )}

        {/* ============= CONVERSATION AREA ============= */}
        <div
          ref={animation.containerRef}
          className="relative flex-grow flex flex-col items-center pt-8 pb-32 overflow-y-auto"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        >
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-900 to-transparent z-10 pointer-events-none" />

          <div className="w-full flex flex-col items-center gap-8 px-4">
            {path.map((nodeId, idx) => {
              const node = nodes.find(n => n.id === nodeId);
              if (!node) return null;

              return (
                <div
                  key={node.id}
                  data-node-id={node.id}
                  className={`transition-all duration-300 ${idx < path.length - 1 ? 'opacity-60' : ''}`}
                >
                  <PrompterLine
                    node={node}
                    isCurrent={node.id === currentNodeId}
                    isEditing={isEditing && node.id === currentNodeId}
                    onTextChange={(e) => handleTextChange(e, node.id)}
                    onClick={() => handleNodeClick(node.id)}
                    isChoice={idx < path.length - 1}
                  />
                </div>
              );
            })}

            {nextPossibleNodes.length > 0 && !isFrozen && !isRecording && (
              <div className="mt-4 w-full max-w-4xl border-t-2 border-gray-700 pt-8 flex flex-col items-center gap-4">
                <p className="text-gray-400 mb-4">Next Options:</p>
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

            {nextPossibleNodes.length === 0 && !isRecording && (
              <div className="mt-8">
                <button
                  onClick={() => {
                    onClose();
                    navigate('/feedback');
                  }}
                  className="bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700"
                >
                  End of Script - View Feedback
                </button>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-900 to-transparent z-10 pointer-events-none" />
        </div>

        {/* ============= FOOTER CONTROLS ============= */}
        <div className="bg-black bg-opacity-50 mt-auto z-20">
          <div className="w-full bg-gray-700 h-1">
            <div className="bg-indigo-500 h-1 transition-all" style={{ width: `${progress}%` }} />
          </div>

          <div className="p-4 flex justify-center items-center gap-4 flex-wrap">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 text-gray-300 hover:text-white disabled:opacity-50"
              disabled={isRecording}
              title="Restart practice"
            >
              <RotateCcw size={20} /> Restart
            </button>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 text-gray-300 hover:text-white disabled:opacity-50"
              disabled={!isFrozen}
              title="Edit response text"
            >
              {isEditing ? <><Check size={20} /> Save</> : <><Edit size={20} /> Edit</>}
            </button>

            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transform hover:scale-110 transition-transform ${
                isRecording ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
              }`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-white animate-pulse"></div>
                  <StopCircle size={20} /> Stop
                </>
              ) : (
                <>
                  <Mic size={20} /> Record
                </>
              )}
            </button>

            {isFrozen && (
              <button
                onClick={() => setIsFrozen(false)}
                className="flex items-center gap-2 text-gray-300 hover:text-white"
                title="Resume practice"
              >
                <Play size={20} /> Resume
              </button>
            )}

            {orchestrator.isGenerating && (
              <div className="flex items-center gap-2 text-blue-400">
                <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse"></div>
                <span className="text-sm">AI thinking...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}