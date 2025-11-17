import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Send, Plus, Zap, Play, Settings, X, MessageSquare, GitBranch, Mic, MicOff } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import Dashboard from './components/Dashboard';
import ScriptBuilder from './components/ScriptBuilder';
import PracticeView from './components/PracticeView';

export default function App() {
  // Global State
  const [page, setPage] = useState('dashboard');
  const [scripts, setScripts] = useState([]);

  const [difficulty, setDifficulty] = useState('medium');
  const [showSettings, setShowSettings] = useState(false);

  // Script Builder State
  const [builderMode, setBuilderMode] = useState(null);
  const [scriptName, setScriptName] = useState('');
  const [scriptNodes, setScriptNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Practice View State
  const [currentScript, setCurrentScript] = useState(null);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [practiceStarted, setPracticeStarted] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    fetchScripts();

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript); // Set user input with the transcript
        // Automatically submit after transcription
        // We need to pass the transcript directly because state updates are async
        submitUserLine(transcript);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    } else {
      console.warn('Speech Recognition not supported in this browser.');
    }
  }, []);

  // Speech-to-Text Functions
  const toggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };


  // AI Voice Synthesis
  const speak = async (text) => {
    if (!voiceEnabled) return;

    setIsSpeaking(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('synthesize-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'en-US', name: 'en-US-Standard-C', ssmlGender: 'FEMALE' },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      });

      if (error) {
        throw error;
      }

      if (response.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${response.audioContent}`);
        audio.play();
        audio.onended = () => setIsSpeaking(false);
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Error with speech synthesis:', error);
      alert('Could not play AI voice. Check console for details. The Text-to-Speech API may need to be enabled in your Google Cloud project.');
      setIsSpeaking(false);
    }
  };

  // Supabase Script Functions
  const fetchScripts = async () => {
    const { data, error } = await supabase.from('scripts').select('*');
    if (error) {
      console.error('Error fetching scripts:', error);
    } else {
      setScripts(data);
    }
  };

  // Script Builder Functions
  const addNode = () => {
    const newNode = { id: Date.now(), content: 'New sales line...', branches: [] };
    setScriptNodes([...scriptNodes, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const updateNode = (nodeId, content) => {
    setScriptNodes(prev => prev.map(n => n.id === nodeId ? { ...n, content } : n));
  };

  const addBranchToNode = (nodeId) => {
    const newBranch = { id: Date.now(), condition: 'Customer says...', nextNodeId: null };
    setScriptNodes(prev => prev.map(n => 
      n.id === nodeId ? { ...n, branches: [...n.branches, newBranch] } : n
    ));
  };

  const updateBranch = (nodeId, branchId, updatedFields) => {
    setScriptNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        const updatedBranches = n.branches.map(b => b.id === branchId ? { ...b, ...updatedFields } : b);
        return { ...n, branches: updatedBranches };
      }
      return n;
    }));
  };

  const saveScript = async () => {
    if (!scriptName.trim() || scriptNodes.length === 0) {
      alert('Script name and at least one node required');
      return;
    }
    const { data, error } = await supabase
      .from('scripts')
      .insert([{ name: scriptName, nodes: scriptNodes, difficulty }])
      .select();

    if (error) {
      alert('Error saving script: ' + error.message);
    } else {
      setScripts([...scripts, ...data]);
      setBuilderMode(null);
      setScriptName('');
      setScriptNodes([]);
      setPage('dashboard');
    }
  };

  const handleDeleteScript = async (scriptId) => {
    // Optimistically remove the script from the UI
    const originalScripts = scripts;
    setScripts(scripts.filter(s => s.id !== scriptId));

    const { error } = await supabase.from('scripts').delete().eq('id', scriptId);
    if (error) {
      alert('Error deleting script: ' + error.message);
      setScripts(originalScripts); // Revert if the delete fails
    }
  };

  // Practice View Functions
  const startPractice = (script) => {
    setCurrentScript(script);
    setCurrentNodeId(script.nodes[0]?.id);
    setConversation([]);
    setPracticeStarted(false);
    setPage('practice');
  };

  const submitUserLine = async (line) => {
    const textToSubmit = line || userInput;
    if (!textToSubmit.trim() || isAiResponding) return;

    const newConversation = [...conversation, { type: 'user', text: textToSubmit }];
    setConversation(newConversation);
    setUserInput('');
    setIsAiResponding(true);

    try {
      const currentNode = currentScript.nodes.find(n => n.id === currentNodeId);
      const history = newConversation.map(m => `${m.type === 'user' ? 'Salesperson' : 'Customer'}: ${m.text}`).join('\n');

      const prompt = `You are a potential customer in a sales practice scenario. The salesperson is practicing a cold call.
      The overall script name is "${currentScript.name}".
      The salesperson's suggested line from their script is: "${currentNode?.content || 'No specific line right now.'}"
      
      Here is the conversation history so far:
      ${history}
      
      The salesperson just said: "${textToSubmit}"
      
      Your task: Respond as the customer would in a realistic way, based on the conversation. Keep your response concise and natural. Do not act as an AI assistant; stay in character as the customer.`;

      const { data, error } = await supabase.functions.invoke('generate-ai-response', {
        method: 'POST',
        body: { prompt },
      });

      if (error) {
        throw error;
      }

      const { aiResponse } = data;

      setConversation(prev => [...prev, { type: 'ai', text: aiResponse }]);
      speak(aiResponse);

    } catch (error) {
      alert('Error getting AI response: ' + error.message);
      // If the API fails, remove the user's last message to allow them to try again.
      setConversation(newConversation.slice(0, -1));
    } finally {
      setIsAiResponding(false);
    }
  };

  // AI Script Generation
  const generateScriptWithAI = async () => {
    try {
      const prompt = `Generate a ${difficulty} difficulty sales script with 4-5 conversational nodes. Format as JSON array with this structure: [{"id": 1, "content": "your line here", "branches": []}]. Make it realistic and practical for sales practice.`;

      // This can also be moved to an edge function for consistency
      const { data, error } = await supabase.functions.invoke('generate-script', {
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (error) {
        throw error;
      }

      const generatedText = data.aiResponse;
      
      if (!generatedText) {
        throw new Error('No content generated');
      }

      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      const nodes = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      if (nodes.length === 0) {
        throw new Error('Could not parse generated script');
      }

      setScriptName('AI Generated Script - ' + new Date().toLocaleDateString());
      setScriptNodes(nodes);
      setBuilderMode('create');
    } catch (error) {
      alert('Error generating script: ' + error.message);
      console.error(error);
    }
  };

  const enhanceNodeWithAI = async (nodeId, currentContent) => {
    setIsEnhancing(true);

    try {
      const prompt = currentContent.trim()
        ? `You are a sales scriptwriting assistant. Enhance this single line for a cold call script to be more effective, persuasive, or engaging. Only return the improved line of text, nothing else.\n\nOriginal line: "${currentContent}"`
        : `You are a sales scriptwriting assistant. Generate a single, compelling opening line for a cold call script. Only return the line of text, nothing else.`;

      const { data, error } = await supabase.functions.invoke('generate-ai-response', {
        method: 'POST',
        body: { prompt },
      });

      if (error) {
        throw error;
      }

      const enhancedText = data.aiResponse;
      if (!enhancedText) {
        throw new Error('No response generated from AI.');
      }

      // Clean up the response, removing quotes if the AI wraps it in them.
      const cleanedText = enhancedText.trim().replace(/^"|"$/g, '');
      updateNode(nodeId, cleanedText);
    } catch (error) {
      alert('Error enhancing node: ' + error.message);
    } finally {
      setIsEnhancing(false);
    }
  };

  const Navigation = () => (
    <div className="bg-white border-b shadow p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600">ScriptMaster</h1>
        <button onClick={() => setShowSettings(true)} className="p-2 bg-gray-100 rounded hover:bg-gray-200">
          <Settings size={20} />
        </button>
      </div>
    </div>
  );

  if (showSettings) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Settings</h2>
              <button onClick={() => setShowSettings(false)}><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full px-3 py-2 border rounded">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold">Enable AI Voice</label>
                <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`w-12 h-6 rounded-full flex items-center transition-colors ${voiceEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                  <span className={`inline-block w-5 h-5 bg-white rounded-full transform transition-transform ${voiceEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <button onClick={() => setShowSettings(false)} className="w-full bg-indigo-600 text-white font-semibold py-2 rounded">Done</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <Dashboard
          scripts={scripts}
          setBuilderMode={setBuilderMode}
          addNode={addNode}
          generateScriptWithAI={generateScriptWithAI}
          startPractice={startPractice}
          handleDelete={handleDeleteScript}
        />
      </div>
    );
  }

  if (builderMode) {
    const currentNode = scriptNodes.find(n => n.id === selectedNodeId);
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
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
                            <p className="text-sm text-gray-700">Next Node: (Not linked)</p>
                            <select
                              value={branch.nextNodeId || ''}
                              onChange={(e) => updateBranch(selectedNodeId, branch.id, { nextNodeId: e.target.value ? parseInt(e.target.value) : null })}
                              className="w-full text-sm bg-transparent focus:outline-none text-gray-700"
                            >
                              <option value="">-- Link to Node --</option>
                              {scriptNodes.map((node, idx) => (
                                <option key={node.id} value={node.id}>
                                  {idx + 1}. {node.content.substring(0, 30)}...
                                </option>
                              ))}
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
      </div>
    );
  }

  if (page === 'practice' && currentScript) {
    const currentNode = currentScript.nodes.find(n => n.id === currentNodeId);

    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{currentScript.name}</h1>
            <button onClick={() => setPage('dashboard')} className="bg-gray-400 text-white py-2 px-4 rounded">Exit</button>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white rounded-lg shadow p-6">
              {!practiceStarted ? (
                <button onClick={() => { setPracticeStarted(true); const greeting = 'Hi, how can I help?'; setConversation([{ type: 'ai', text: greeting }]); speak(greeting); }} className="w-full bg-green-600 text-white font-bold py-6 rounded text-xl hover:bg-green-700">Start Call</button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded h-64 overflow-y-auto border-2 border-gray-200">
                    {conversation.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
                        <div className={`max-w-xs p-3 rounded ${msg.type === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>{msg.text}</div>
                      </div>
                    ))}
                    {isAiResponding && (
                      <div className="flex justify-start mb-3">
                        <div className="max-w-xs p-3 rounded bg-gray-200 text-gray-500">...</div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 space-y-2">
                    <textarea disabled={isAiResponding || isSpeaking || isListening} value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Type or use the microphone..." className="w-full px-3 py-2 border-2 rounded h-20" />
                    <div className="flex gap-2">
                       <button onClick={() => submitUserLine()} disabled={isAiResponding || isSpeaking || isListening} className="flex-grow bg-indigo-600 text-white font-semibold py-2 rounded hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:bg-indigo-400">
                         {isAiResponding ? '...' : <><Send size={18} /> Say</>}
                       </button>
                       <button onClick={toggleListening} disabled={isAiResponding || isSpeaking} className={`p-3 rounded ${isListening ? 'bg-red-500' : 'bg-green-500'} text-white`}>
                         {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                       </button>
                    </div>
                    <button onClick={() => setPage('dashboard')} className="w-full bg-red-600 text-white font-semibold py-2 rounded hover:bg-red-700">
                      End Call
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h3 className="text-lg font-bold mb-4 text-center">Teleprompter</h3>
              {currentNode ? (
                <div>
                  <div className="bg-gray-800 text-white rounded-lg p-6 mb-6 text-center">
                    {conversation.length > 0 && conversation[conversation.length - 1].type === 'ai' && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-400 uppercase tracking-wider">Customer Said</p>
                        <p className="text-lg italic text-gray-300">"{conversation[conversation.length - 1].text}"</p>
                      </div>
                    )}
                    <p className="text-sm text-indigo-400 uppercase tracking-wider">Your Next Line</p>
                    <p className="text-2xl font-bold leading-tight">{currentNode.content}</p>
                  </div>

                  {conversation.length > 0 && !isAiResponding && currentNode.branches.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2 text-center">Choose Your Path</p>
                      <div className="space-y-2">
                        {currentNode.branches.map(branch => (
                          <button 
                            key={branch.id}
                            onClick={() => setCurrentNodeId(branch.nextNodeId)}
                            disabled={!branch.nextNodeId}
                            className="w-full text-left p-3 rounded bg-gray-100 hover:bg-indigo-100 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <p className="text-sm font-semibold">{branch.condition}</p>
                            <p className="text-xs text-gray-500">→ Go to node: "{currentScript.nodes.find(n => n.id === branch.nextNodeId)?.content.substring(0, 20) || 'Not Linked'}..."</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : <p className="text-gray-600 text-sm">Practice session ended or script has no nodes.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;