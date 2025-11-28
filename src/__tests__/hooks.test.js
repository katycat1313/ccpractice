import { renderHook, act } from '@testing-library/react';
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer';
import { useStreamingTranscription } from '../hooks/useStreamingTranscription';
import { useAIResponseOrchestrator } from '../hooks/useAIResponseOrchestrator';

describe('Recording Hooks', () => {
  test('useAudioAnalyzer initializes', () => {
    const { result } = renderHook(() => useAudioAnalyzer());
    expect(result.current).toHaveProperty('startAnalysis');
    expect(result.current).toHaveProperty('stopAnalysis');
    expect(result.current).toHaveProperty('setSensitivity');
  });

  test('useStreamingTranscription initializes', () => {
    const { result } = renderHook(() => useStreamingTranscription());
    expect(result.current).toHaveProperty('startStreaming');
    expect(result.current).toHaveProperty('stopStreaming');
    expect(result.current.currentTranscript).toBe('');
  });

  test('useAIResponseOrchestrator initializes', () => {
    const { result } = renderHook(() => useAIResponseOrchestrator());
    expect(result.current).toHaveProperty('generateProspectResponse');
    expect(result.current).toHaveProperty('startOrchestration');
    expect(result.current.isGenerating).toBe(false);
  });

  test('Audio analyzer can set sensitivity', () => {
    const { result } = renderHook(() => useAudioAnalyzer());
    
    act(() => {
      result.current.setSensitivity(75);
    });

    const patterns = result.current.getSpeechPatterns();
    expect(patterns).toHaveProperty('avgPauseLength');
  });

  test('Orchestrator can reset state', () => {
    const { result } = renderHook(() => useAIResponseOrchestrator());
    
    act(() => {
      result.current.reset();
    });

    expect(result.current.queuedResponse).toBeNull();
    expect(result.current.responseHistory).toEqual([]);
  });
});