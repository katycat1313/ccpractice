import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Play, Pause, Edit, Check, RotateCcw, Mic, StopCircle, X, ZoomIn, ZoomOut, Maximize2, AlertCircle } from 'lucide-react';
import AnimatedScriptView from '../components/AnimatedScriptView';
import PrompterLine from '../components/PrompterLine';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer';
import { useStreamingTranscription } from '../hooks/useStreamingTranscription';
import { useAIResponseOrchestrator } from '../hooks/useAIResponseOrchestrator';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { getProspectVoiceConfig, getProspect } from '../lib/prospects';
import { debugLog, debugError, debugWarn, debugTrace, debugSuccess, PerformanceTracker } from '../lib/debugUtils';

export default function PracticePage({ script, setScript, setFeedback, setTranscript, onClose, prospect, difficulty: passedDifficulty }) {
  // ============= PROSPECT DATA =============
  const prospectData = prospect || getProspect('sarah'); // default to Sarah if not provided

  // Validate script on mount
  useEffect(() => {
    if (!script || !script.nodes || !Array.isArray(script.nodes)) {
      debugError('PracticePage', 'Invalid script structure', null, { script });
    } else {
      debugSuccess('PracticePage', 'Script loaded', { nodeCount: script.nodes.length });
    }
  }, [script]);

  // ============= STATE MANAGEMENT =============
  const [isRecording, setIsRecording] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [path, setPath] = useState([]);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sensitivity, setSensitivity] = useState(50);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // ============= HOOKS =============
  const analyzer = useAudioAnalyzer(
    () => console.log('[PracticePage] Speech ended'),
    () => console.log('[PracticePage] Speech started')
  );
  const transcription = useStreamingTranscription();
  const orchestrator = useAIResponseOrchestrator();
  const tts = useTextToSpeech();

  const navigate = useNavigate();
  const recordingStreamRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const { nodes, edges, metadata } = script || { nodes: [], edges: [], metadata: {} };
  const difficulty = passedDifficulty || metadata?.difficulty || 'Medium';
  // ============= INITIALIZATION =============
  const handleRestart = useCallback(() => {
    if (nodes.length > 0) {
      const rootNode = nodes.find(n => !edges.some(e => e.target === n.id)) || nodes[0];
      setPath([rootNode.id]);
      setRecordingDuration(0);
      setIsFrozen(false);
      setIsEditing(false);
      setError(null);
      orchestrator.reset();
      transcription.reset();
    }
  }, [nodes, edges, orchestrator, transcription]);

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
    const perf = new PerformanceTracker('handleStartRecording');
    try {
      setError(null);
      debugTrace('PracticePage', 'recording_start_attempt');

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!stream) {
        throw new Error('Failed to get microphone stream');
      }
      recordingStreamRef.current = stream;
      debugSuccess('PracticePage', 'Microphone stream acquired');

      // Start all subsystems
      const analyzerStarted = await analyzer.startAnalysis(stream);
      if (!analyzerStarted) {
        const err = 'Failed to start audio analyzer';
        debugError('PracticePage', err);
        setError(err);
        return;
      }
      debugSuccess('PracticePage', 'Audio analyzer started');

      await transcription.startStreaming(stream);
      debugSuccess('PracticePage', 'Transcription streaming started');

      analyzer.setSensitivity(sensitivity);

      // Start orchestration loop
      orchestrator.startOrchestration(
        analyzer,
        buildConversationHistory(),
        difficulty,
        () => {
          debugTrace('PracticePage', 'ai_response_ready');
          console.log('[PracticePage] Response ready!');
        }
      );
      debugSuccess('PracticePage', 'Orchestration started');

      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();

      // Track recording duration
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
      }, 100);

      debugSuccess('PracticePage', 'Recording started successfully');
      perf.end();
    } catch (err) {
      debugError('PracticePage', 'Error starting recording', err);
      setError(`Failed to start recording: ${err.message}`);
      perf.end();
    }
  };

  const handleStopRecording = async () => {
    const perf = new PerformanceTracker('handleStopRecording');
    try {
      debugTrace('PracticePage', 'recording_stop_attempt');
      setIsRecording(false);
      setIsFrozen(true);

      // Stop all subsystems
      analyzer.stopAnalysis();
      debugSuccess('PracticePage', 'Audio analyzer stopped');

      orchestrator.stopOrchestration();
      debugSuccess('PracticePage', 'Orchestration stopped');

      const finalTranscript = await transcription.stopStreaming();
      if (!finalTranscript) {
        debugWarn('PracticePage', 'Empty transcript returned');
      }
      setTranscript(finalTranscript);
      debugSuccess('PracticePage', 'Transcription stopped', { transcriptLength: finalTranscript?.length || 0 });

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach(track => {
          track.stop();
          debugTrace('PracticePage', 'microphone_track_stopped');
        });
      }

      debugSuccess('PracticePage', 'Recording stopped successfully');

      // Generate feedback
      const scriptText = nodes.map(node => node.data.text).join(' ');
      debugTrace('PracticePage', 'feedback_generation_start', { scriptLength: scriptText.length });

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
        debugError('PracticePage', 'Feedback generation error', feedbackError);
      } else {
        setFeedback(feedbackData);
        debugSuccess('PracticePage', 'Feedback generated successfully');
      }

      perf.end();
    } catch (err) {
      debugError('PracticePage', 'Error stopping recording', err);
      setError(`Failed to stop recording: ${err.message}`);
      perf.end();
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

        // Advance path
        const newPath = [...path, newNodeId];
        setPath(newPath);

        // Play audio for the response
        console.log('[PracticePage] Playing TTS for response:', response.text.substring(0, 50));
        const voiceConfig = prospect ? getProspectVoiceConfig(prospect.id) : getProspectVoiceConfig('sarah');
        tts.synthesizeAndPlay(response.text, voiceConfig);
      }
    }
  }, [orchestrator.queuedResponse, isRecording, isFrozen, path, nodes, script, animation, tts]);

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
            <p className="text-sm text-blue-400 mt-1">With: {prospectData.name}</p>
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
          <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400 whitespace-nowrap">Sensitivity:</label>
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
                className="w-40"
              />
              <span className="text-xs text-gray-400 w-10">{sensitivity}%</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400 whitespace-nowrap">Playback Speed:</label>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-1 text-sm"
              >
                <option value={0.75}>0.75x (Slower)</option>
                <option value={1}>1x (Normal)</option>
                <option value={1.25}>1.25x (Faster)</option>
                <option value={1.5}>1.5x (Much Faster)</option>
              </select>
            </div>

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
        <div className="relative flex-grow flex flex-col items-center overflow-hidden">
          <AnimatedScriptView
            nodes={nodes}
            path={path}
            nextPossibleNodes={nextPossibleNodes}
            currentNodeId={currentNodeId}
            isRecording={isRecording}
            isFrozen={isFrozen}
            isEditing={isEditing}
            playbackSpeed={playbackSpeed}
            zoom={zoom}
            onNodeClick={handleNodeClick}
            onTextChange={handleTextChange}
          />
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

            {!isRecording && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">Speed:</label>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs"
                >
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                </select>
              </div>
            )}

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