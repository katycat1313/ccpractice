import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Play, Pause, Edit, Check, RotateCcw, Mic, StopCircle, X, ZoomIn, ZoomOut, Maximize2, AlertCircle } from 'lucide-react';
import ConversationView from '../components/ConversationView';
import SmartPrompter from '../components/SmartPrompter';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer';
import { useStreamingTranscription } from '../hooks/useStreamingTranscription';
import { useAIResponseOrchestrator } from '../hooks/useAIResponseOrchestrator';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useSmartPrompter } from '../hooks/useSmartPrompter';
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
  const [conversation, setConversation] = useState([]);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sensitivity, setSensitivity] = useState(50);
  const [prompterVisible, setPrompterVisible] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // ============= HOOKS =============
  const analyzer = useAudioAnalyzer(
    () => console.log('[PracticePage] Speech ended'),
    () => console.log('[PracticePage] Speech started')
  );
  const transcription = useStreamingTranscription();
  const orchestrator = useAIResponseOrchestrator();
  const tts = useTextToSpeech();
  const smartPrompter = useSmartPrompter(script);

  const navigate = useNavigate();
  const recordingStreamRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const { nodes, edges, metadata } = script || { nodes: [], edges: [], metadata: {} };
  const difficulty = passedDifficulty || metadata?.difficulty || 'Medium';

  // ============= INITIALIZATION =============
  const handleRestart = useCallback(() => {
    setConversation([]);
    setLiveTranscript('');
    setRecordingDuration(0);
    setIsFrozen(false);
    setError(null);
    orchestrator.reset();
    transcription.reset();
    debugSuccess('PracticePage', 'Session restarted');
  }, [orchestrator, transcription]); // Removed smartPrompter from dependencies

  useEffect(() => {
    handleRestart();
    smartPrompter.reset(); // Reset smartPrompter directly here
  }, []); // Empty deps - only run once on mount

  // ============= CONVERSATION MANAGEMENT =============
  const buildConversationHistory = useCallback(() => {
    return conversation.map(msg => ({
      speaker: msg.speaker,
      text: msg.text,
    }));
  }, [conversation]);

  // Track live transcription
  useEffect(() => {
    if (transcription.transcript) {
      setLiveTranscript(transcription.transcript);
    }
  }, [transcription.transcript]);

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

      // ============= AI SPEAKS FIRST =============
      // Generate opening message from AI prospect
      debugLog('PracticePage', 'Generating AI opening message');
      const openingResponse = await orchestrator.forceGenerateResponse([], difficulty);
      
      if (openingResponse) {
        // Add AI's opening to conversation
        const prospectMessage = {
          id: openingResponse.id || `prospect-opening-${Date.now()}`,
          speaker: 'Prospect',
          text: openingResponse.text,
          timestamp: Date.now(),
        };
        setConversation([prospectMessage]);
        debugSuccess('PracticePage', 'AI opening message added to conversation');

        // Play the opening audio
        const voiceConfig = prospect ? getProspectVoiceConfig(prospect.id) : getProspectVoiceConfig('sarah');
        await tts.synthesizeAndPlay(openingResponse.text, voiceConfig);
        debugSuccess('PracticePage', 'AI opening message playing');
      } else {
        debugWarn('PracticePage', 'Failed to generate AI opening message');
      }
      // ============================================

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

      // Stop all subsystems
      analyzer.stopAnalysis();
      debugSuccess('PracticePage', 'Audio analyzer stopped');

      orchestrator.stopOrchestration();
      debugSuccess('PracticePage', 'Orchestration stopped');

      const finalTranscript = await transcription.stopStreaming();
      if (!finalTranscript) {
        debugWarn('PracticePage', 'Empty transcript returned');
      }

      // Add user's message to conversation
      if (finalTranscript) {
        const userMessage = {
          id: `user-${Date.now()}`,
          speaker: 'You',
          text: finalTranscript,
          timestamp: Date.now(),
        };
        setConversation(prev => [...prev, userMessage]);
        debugSuccess('PracticePage', 'User message added to conversation');
      }

      setTranscript(finalTranscript);
      setLiveTranscript('');
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
        // Add prospect's response to conversation
        const prospectMessage = {
          id: response.id || `prospect-${Date.now()}`,
          speaker: 'Prospect',
          text: response.text,
          timestamp: Date.now(),
        };

        setConversation(prev => [...prev, prospectMessage]);
        debugSuccess('PracticePage', 'Prospect response added to conversation');

        // Analyze response and update smart prompter
        smartPrompter.analyzeAndSuggest(response.text, conversation);

        // Play audio for the response
        console.log('[PracticePage] Playing TTS for response:', response.text.substring(0, 50));
        const voiceConfig = prospect ? getProspectVoiceConfig(prospect.id) : getProspectVoiceConfig('sarah');
        tts.synthesizeAndPlay(response.text, voiceConfig);
      }
    }
  }, [orchestrator.queuedResponse, isRecording, isFrozen, conversation, smartPrompter, prospect, tts]);

  // ============= UI CALCULATIONS =============
  const progress = conversation.length > 0 ? Math.min((conversation.length / 10) * 100, 100) : 0;

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
    <div className="fixed inset-0 flex justify-center items-center z-50 font-['OpenDyslexic'] overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      }}
    >
      {/* Animated Background Shapes */}
      <div className="fixed inset-0 z-10 overflow-hidden pointer-events-none">
        <div className="floating-shape absolute top-20 left-10 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-xl"></div>
        <div className="floating-shape absolute top-40 right-20 w-48 h-48 bg-purple-300 bg-opacity-20 rounded-full blur-2xl"></div>
        <div className="floating-shape absolute bottom-20 left-1/4 w-40 h-40 bg-pink-300 bg-opacity-15 rounded-full blur-xl"></div>
        <div className="floating-shape absolute bottom-32 right-1/3 w-56 h-56 bg-blue-300 bg-opacity-10 rounded-full blur-2xl"></div>
      </div>

      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-20 z-20"></div>

      <div className="relative z-50 rounded-3xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 50%, #fce7f3 100%)',
        }}
      >
        {/* ============= HEADER ============= */}
        <div className="relative flex justify-between items-center p-6 border-b border-purple-200/50"
          style={{
            background: 'linear-gradient(90deg, rgba(224, 242, 254, 0.8) 0%, rgba(221, 214, 254, 0.8) 50%, rgba(252, 231, 243, 0.8) 100%)',
          }}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-2 right-16 w-24 h-24 bg-blue-400 rounded-full opacity-20 blur-xl"></div>
            <div className="absolute bottom-2 left-12 w-28 h-28 bg-purple-400 rounded-full opacity-15 blur-2xl"></div>
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg">
              <span className="text-xs uppercase tracking-widest text-white font-bold">Difficulty</span>
              <p className="text-lg font-bold text-white">{difficulty}</p>
            </div>
          </div>

          <div className="relative z-10 text-center">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Practice Session
            </h2>
            <p className="text-sm text-purple-600 mt-1 font-semibold">
              With: {prospectData.name}
            </p>
            {isRecording && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                <p className="text-sm text-red-600 font-semibold">
                  Recording: {recordingDuration}s
                </p>
              </div>
            )}
          </div>

          <div className="relative z-10 flex gap-3">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="p-2 rounded-lg bg-white/50 hover:bg-white/80 text-purple-600 transition-all shadow-md hover:shadow-lg"
              title="Zoom out"
            >
              <ZoomOut size={20} />
            </button>
            <span className="text-sm text-purple-700 font-semibold pt-2">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(150, zoom + 10))}
              className="p-2 rounded-lg bg-white/50 hover:bg-white/80 text-purple-600 transition-all shadow-md hover:shadow-lg"
              title="Zoom in"
            >
              <ZoomIn size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/50 hover:bg-white/80 text-purple-600 transition-all shadow-md hover:shadow-lg"
            >
              <X size={24} />
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
        <ConversationView
          conversation={conversation}
          isRecording={isRecording}
          liveTranscript={liveTranscript}
          isAIThinking={orchestrator.isGenerating}
          zoom={zoom}
          prospectName={prospectData.name}
        />

        {/* ============= SMART PROMPTER ============= */}
        <SmartPrompter
          suggestedLine={smartPrompter.currentSuggestion?.text}
          detectedIntent={smartPrompter.detectedIntent?.label}
          confidence={smartPrompter.currentSuggestion?.confidence || 0}
          alternatives={smartPrompter.alternatives}
          onSelectAlternative={(alt) => smartPrompter.setSuggestion(alt.text, alt.nodeId)}
          isVisible={prompterVisible}
          onToggleVisibility={() => setPrompterVisible(!prompterVisible)}
        />

        {/* ============= FOOTER CONTROLS ============= */}
        <div className="relative z-20" style={{
          background: 'linear-gradient(180deg, rgba(224, 242, 254, 0.8) 0%, rgba(221, 214, 254, 0.8) 50%, rgba(252, 231, 243, 0.8) 100%)',
        }}>
          {/* Progress bar */}
          <div className="w-full h-2 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 transition-all duration-500 shadow-lg"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-6 flex justify-center items-center gap-6 flex-wrap">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/60 hover:bg-white/90 text-purple-700 font-semibold disabled:opacity-50 shadow-md hover:shadow-lg transition-all transform hover:scale-105"
              disabled={isRecording}
              title="Restart practice"
            >
              <RotateCcw size={20} /> Restart
            </button>

            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold shadow-2xl transform hover:scale-110 transition-all ${
                isRecording
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
              }`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? (
                <>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <StopCircle size={24} />
                  <span className="text-lg">Stop Recording</span>
                </>
              ) : (
                <>
                  <Mic size={24} />
                  <span className="text-lg">Start Practice</span>
                </>
              )}
            </button>

            {orchestrator.isGenerating && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse shadow-lg"></div>
                <span className="text-sm font-semibold text-purple-700">AI thinking...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}