import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { 
  Play, 
  Pause, 
  Trash2, 
  Clock, 
  Calendar, 
  PhoneCall, 
  Search,
  CheckCircle2,
  ChevronDown,
  BarChart3,
  Volume2,
  ArrowRight,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { getRecordings, deleteRecording, formatSeconds } from '../lib/recordingsService';

export default function RecordingsPage() {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState([]);
  const [activeRecordingId, setActiveRecordingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const audioRef = useRef(null);
  const playbackTimerRef = useRef(null);

  useEffect(() => {
    const list = getRecordings();
    setRecordings(list);
    if (list.length > 0) setExpandedId(list[0].id);

    const handleUpdate = () => {
      setRecordings(getRecordings());
    };
    window.addEventListener('scriptmaster_recordings_updated', handleUpdate);
    return () => {
      window.removeEventListener('scriptmaster_recordings_updated', handleUpdate);
      stopPlayback();
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setIsPlaying(false);
  };

  const handlePlayToggle = (rec) => {
    if (activeRecordingId === rec.id && isPlaying) {
      stopPlayback();
      return;
    }

    stopPlayback();
    setActiveRecordingId(rec.id);
    setExpandedId(rec.id);
    setTotalDuration(rec.duration || 60);

    if (rec.audioUrl) {
      const audio = new Audio(rec.audioUrl);
      audioRef.current = audio;
      audio.currentTime = currentTime;
      
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      };
      
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        startSimulatedPlayback(rec.duration || 60);
      });

      playbackTimerRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(Math.floor(audioRef.current.currentTime));
        }
      }, 250);
    } else {
      startSimulatedPlayback(rec.duration || 60);
    }
  };

  const startSimulatedPlayback = (duration) => {
    setIsPlaying(true);
    playbackTimerRef.current = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= duration) {
          stopPlayback();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleSeek = (newTime, rec) => {
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    if (!isPlaying) {
      handlePlayToggle(rec);
    }
  };

  const handleDelete = (id, title) => {
    if (activeRecordingId === id) {
      stopPlayback();
      setActiveRecordingId(null);
    }
    deleteRecording(id);
    showToast(`Deleted "${title}"`);
  };

  const filtered = recordings.filter(r => {
    const q = searchQuery.toLowerCase();
    return (
      (r.title || '').toLowerCase().includes(q) ||
      (r.prospectName || '').toLowerCase().includes(q) ||
      (r.scriptTitle || '').toLowerCase().includes(q)
    );
  });

  const totalPracticeSeconds = recordings.reduce((acc, r) => acc + (r.duration || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F6FC] to-[#ECEEF8] text-[#1e293b] flex flex-col font-sans antialiased">
      <Navbar />

      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-white border border-slate-200/80 text-slate-800 px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-slate-600 text-xs font-semibold shadow-xs border border-slate-200/70 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>

            <span className="text-slate-300">/</span>

            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                Call Recordings
              </h1>
            </div>
          </div>

          <button
            onClick={() => navigate('/practice')}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:opacity-95 text-white font-semibold text-xs transition flex items-center gap-2 shadow-[0_4px_14px_rgba(99,102,241,0.25)] self-start sm:self-auto cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5 fill-white" />
            <span>Record New Call</span>
          </button>
        </div>

        {/* Clean Header Stats & Call Frequency Bar Chart (Screenshot 1 Reference) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          
          {/* Call Frequency Bar Chart (Minimalist) */}
          <div className="md:col-span-7 soft-card p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>Call frequency</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Cold call duration across recent sessions</p>
              </div>
              <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                Past 7 Days
              </span>
            </div>

            {/* Vertical Bar Chart */}
            <div className="pt-6 pb-2">
              <div className="flex items-end justify-between h-24 px-2 border-b border-slate-100 gap-3">
                {[
                  { day: 'Mon', h: 45, time: '45m' },
                  { day: 'Tue', h: 80, time: '1h 20m' },
                  { day: 'Wed', h: 30, time: '30m' },
                  { day: 'Thu', h: 65, time: '50m' },
                  { day: 'Fri', h: 40, time: '40m' },
                  { day: 'Sat', h: 55, time: '45m' },
                  { day: 'Sun', h: 90, time: '1h 30m' }
                ].map((b, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div 
                      className="w-full max-w-[20px] bg-indigo-500/80 group-hover:bg-indigo-600 rounded-t-md transition-all duration-300 relative cursor-pointer"
                      style={{ height: `${b.h}%` }}
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold bg-slate-800 text-white px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap transition">
                        {b.time}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">{b.day}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-3 text-slate-500 font-normal">
              <span>Weekly Call Time: <strong className="text-slate-800 font-semibold">{formatSeconds(totalPracticeSeconds || 4200)}</strong></span>
              <span className="text-indigo-600 font-semibold">{recordings.length} Total Reps</span>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="md:col-span-5 grid grid-cols-2 gap-4">
            <div className="soft-card p-5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Completed Reps</span>
                <span className="text-3xl font-semibold text-slate-900 mt-2 block font-mono">{recordings.length}</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">✓ Saved in local library</span>
            </div>

            <div className="soft-card p-5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Average Pitch Score</span>
                <span className="text-3xl font-semibold text-indigo-600 mt-2 block font-mono">84%</span>
              </div>
              <span className="text-[11px] text-indigo-600 font-medium">Top closer range</span>
            </div>
          </div>

        </div>

        {/* Search Input Bar */}
        <div className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-full px-4 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recordings by prospect name or script..."
            className="w-full bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Call List with Expandable Rows */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="soft-card text-center py-14 px-4">
              <Volume2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">No recordings yet</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Practice dialing in the simulator to record your calls.
              </p>
              <button
                onClick={() => navigate('/practice')}
                className="mt-4 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
              >
                Go to Practice Call
              </button>
            </div>
          ) : (
            filtered.map((rec) => {
              const isActive = activeRecordingId === rec.id;
              const isExpanded = expandedId === rec.id;
              const duration = rec.duration || 60;
              const displayTime = isActive ? currentTime : 0;
              const progressPct = duration > 0 ? (displayTime / duration) * 100 : 0;

              return (
                <div
                  key={rec.id}
                  className={`soft-card transition-all overflow-hidden ${
                    isActive ? 'ring-2 ring-indigo-500/20 border-indigo-200' : ''
                  }`}
                >
                  {/* Clean List Item Header */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                    className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-semibold text-xs shrink-0">
                        {rec.prospectName ? rec.prospectName.charAt(0) : 'P'}
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-900 tracking-tight truncate">
                            {rec.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {rec.prospectName || 'Target Prospect'} · {rec.date}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-slate-500 font-mono">
                        {formatSeconds(duration)}
                      </span>

                      {/* Play Button on Row */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayToggle(rec);
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition shadow-xs cursor-pointer ${
                          isActive && isPlaying
                            ? 'bg-amber-500 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isActive && isPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>

                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Expandable Audio Scrub Bar & Analysis */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 animate-fadeIn">
                      
                      {/* Audio Frequency Waveform Visualizer */}
                      <div className="flex items-center justify-center gap-1 h-6 my-2">
                        {[6, 12, 18, 24, 14, 28, 20, 10, 24, 16, 30, 22, 12, 24, 16, 20, 10, 16, 22, 14, 8, 6].map((h, i) => (
                          <div
                            key={i}
                            className={`w-1 rounded-full transition-all duration-200 ${
                              isActive && isPlaying ? 'bg-indigo-500' : 'bg-slate-200'
                            }`}
                            style={{
                              height: isActive && isPlaying ? `${Math.max(4, h * 0.85)}px` : '4px'
                            }}
                          />
                        ))}
                      </div>

                      {/* Clickable Audio Scrub Bar */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                          <span className="font-semibold text-slate-700">{formatSeconds(isActive ? displayTime : 0)}</span>
                          <span className="text-[10px] text-slate-400 font-sans">Click anywhere on timeline to jump</span>
                          <span>{formatSeconds(duration)}</span>
                        </div>

                        <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden cursor-pointer group">
                          <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] rounded-full transition-all"
                            style={{ width: `${isActive ? progressPct : 0}%` }}
                          />
                          <input
                            type="range"
                            min="0"
                            max={duration}
                            value={isActive ? displayTime : 0}
                            onChange={(e) => handleSeek(parseFloat(e.target.value), rec)}
                            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                            title="Click to jump to point in recording"
                          />
                        </div>
                      </div>

                      {Array.isArray(rec.transcriptTurns) && rec.transcriptTurns.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Replay transcript timeline</div>
                          <div className="max-h-48 overflow-y-auto space-y-1.5">
                            {rec.transcriptTurns.map((turn, index) => (
                              <button
                                type="button"
                                key={`${rec.id}-turn-${index}`}
                                onClick={() => handleSeek(turn.timestampSeconds || 0, rec)}
                                className="w-full text-left flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-white transition"
                              >
                                <span className="font-mono text-[10px] text-indigo-600 shrink-0">{formatSeconds(turn.timestampSeconds || 0)}</span>
                                <span className="text-[11px] text-slate-700"><strong>{turn.speaker}:</strong> {turn.text}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Power Word & Filler Word Badges */}
                      <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            12 Power Words (20 seconds, Fair?, Thermal scan)
                          </span>
                          <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                            2 Filler Pauses
                          </span>
                        </div>

                        <button
                          onClick={() => handleDelete(rec.id, rec.title)}
                          className="text-xs text-slate-400 hover:text-rose-600 font-medium transition flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>

                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </main>
    </div>
  );
}
