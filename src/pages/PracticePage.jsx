import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, Edit, Mic, Check, SkipForward } from 'lucide-react';
import Navbar from '../components/Navbar';

// A single line in the teleprompter

const PrompterLine = ({ node, isCurrent, isEditing, onTextChange, onClick, isChoice }) => {

  const ref = useRef(null);

  const isYourTurn = node.data.speaker === 'You';



  useEffect(() => {

    if (isCurrent) {

      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    }

  }, [isCurrent]);



  const speakerColor = isYourTurn ? 'text-blue-400' : 'text-gray-400';

  const bgColor = isCurrent ? 'bg-gray-800' : 'bg-transparent';

  const cursor = isChoice ? 'cursor-pointer hover:bg-gray-800' : '';



  return (

    <div

      ref={ref}

      onClick={onClick}

      className={`w-full max-w-4xl rounded-lg p-6 text-center transition-all duration-300 ${bgColor} ${cursor}`}

    >

      <p className={`text-sm font-bold mb-2 ${speakerColor}`}>

        {node.data.speaker?.toUpperCase()}

      </p>

      {isEditing && isCurrent ? (

        <textarea

          value={node.data.text}

          onChange={onTextChange}

          className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-2xl md:text-3xl leading-relaxed text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"

          rows={3}

        />

      ) : (

        <p className="text-2xl md:text-3xl leading-relaxed">

          {node.data.text}

        </p>

      )}

    </div>

  );

};



export default function PracticePage({ setPage, activeScript, setActiveScript }) {

  const [currentNodeId, setCurrentNodeId] = useState(null);

  const [isPaused, setIsPaused] = useState(true);

  const [isEditing, setIsEditing] = useState(false);

  const [path, setPath] = useState([]);



    const { nodes, edges, difficulty } = activeScript || { nodes: [], edges: [], difficulty: 'Medium' };



  



    // On mount, find the root node and initialize the path



    useEffect(() => {



      if (nodes.length > 0) {



        const rootNode = nodes.find(n => !edges.some(e => e.target === n.id)) || nodes[0];



        setCurrentNodeId(rootNode.id);



        setPath([rootNode.id]);



      }



    }, [nodes, edges]);



  



    const nextPossibleNodes = useMemo(() => {



      if (!currentNodeId) return [];



      return edges



        .filter(e => e.source === currentNodeId)



        .map(e => nodes.find(n => n.id === e.target))



        .filter(Boolean);



    }, [currentNodeId, nodes, edges]);



  



    const handleTextChange = (e) => {



      const newText = e.target.value;



      const newNodes = nodes.map(node => {



        if (node.id === currentNodeId) {



          return { ...node, data: { ...node.data, text: newText } };



        }



        return node;



      });



      setActiveScript({ ...activeScript, nodes: newNodes });



    };



    



    const handleNodeClick = (nodeId) => {



      const currentIndexInPath = path.indexOf(nodeId);



      



      // If user clicks on a past node, truncate the path to that point



      if (currentIndexInPath > -1 && currentIndexInPath < path.length - 1) {



        setPath(path.slice(0, currentIndexInPath + 1));



        setCurrentNodeId(nodeId);



        return;



      }



  



      // If user clicks on a valid next node, extend the path



      if (nextPossibleNodes.some(n => n.id === nodeId)) {



        const newPath = [...path, nodeId];



        setPath(newPath);



        setCurrentNodeId(nodeId);



      }



    };



  



    const handleSkip = () => {



      if (nextPossibleNodes.length > 0) {



        handleNodeClick(nextPossibleNodes[0].id);



      }



    };



  



    // Auto-scrolling logic



    useEffect(() => {



      let interval;



      if (!isPaused) {



        interval = setInterval(() => {



          handleSkip();



        }, 3000); // Auto-advances every 3 seconds



      }



      return () => clearInterval(interval);



    }, [isPaused, handleSkip]);



  



  



    if (nodes.length === 0) {



      return (



        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">



          <Navbar setPage={setPage} />



          <h1 className="text-2xl">No script loaded.</h1>



          <button onClick={() => setPage('dashboard')} className="mt-4 bg-indigo-600 px-4 py-2 rounded-md">



            Go to Dashboard



          </button>



        </div>



      );



    }



  



    return (



      <div className="min-h-screen bg-gray-900 text-white flex flex-col font-open-dyslexic overflow-hidden">



        <Navbar setPage={setPage} />



        



        <div className="w-full text-center py-4">



          <span className="text-sm uppercase tracking-widest text-gray-400">Difficulty</span>



          <p className="text-xl font-bold text-yellow-400">{difficulty}</p>



        </div>



  



        <div className="flex-grow flex flex-col items-center pt-8 pb-32 overflow-y-auto">



          {/* Scrolling Teleprompter List */}



          <div className="w-full flex flex-col items-center gap-8">



            {path.map(nodeId => {



              const node = nodes.find(n => n.id === nodeId);



              if (!node) return null;



              return (



                <PrompterLine 



                  key={node.id}



                  node={node}



                  isCurrent={node.id === currentNodeId}



                  isEditing={isEditing}



                  onTextChange={handleTextChange}



                  onClick={() => handleNodeClick(node.id)}



                  isChoice={path.indexOf(node.id) < path.length -1} // Allow clicking on past nodes



                />



              );



            })}



            



            {/* Render next possible nodes as choices */}



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



                <button onClick={() => setPage('feedback')} className="bg-green-600 text-white font-semibold py-3 px-6 rounded-lg">



                  End of Script - Finish Practice



                </button>



              </div>



            )}



          </div>



        </div>



  



        {/* Bottom Control Bar */}



        <div className="bg-black bg-opacity-30 p-4 flex justify-center items-center gap-8 sticky bottom-0">



          <button onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-2 text-gray-300 hover:text-white">



            {isEditing ? <><Check size={20} /> Save</> : <><Edit size={20} /> Edit Line</>}



          </button>



          <button onClick={() => setIsPaused(!isPaused)} className="bg-white text-gray-900 p-4 rounded-full shadow-lg">



            {isPaused ? <Play size={24} className="ml-1" /> : <Pause size={24} />}



          </button>



          <button onClick={handleSkip} className="flex items-center gap-2 text-gray-300 hover:text-white">



            <SkipForward size={20} /> Skip



          </button>



        </div>



      </div>



    );



  }



  
