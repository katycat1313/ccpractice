import React, { useEffect, useRef } from 'react';

const PrompterLine = ({ node, isCurrent, isEditing, onTextChange, onClick, isChoice }) => {
  const ref = useRef(null);
  const isYourTurn = node.data.speaker === 'You';

  useEffect(() => {
    if (isCurrent) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCurrent]);

  const speakerColor = isYourTurn ? 'text-blue-400' : 'text-green-400';
  const bgColor = isCurrent ? 'bg-gray-800' : 'bg-transparent';
  const cursor = isChoice ? 'cursor-pointer hover:bg-gray-800' : '';

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`w-full max-w-4xl rounded-lg p-6 text-center transition-all duration-300 ${bgColor} ${cursor}`}
    >
      <p className={`text-lg font-bold mb-2 ${speakerColor}`}>
        {node.data.speaker?.toUpperCase()}
      </p>
      {isEditing && isCurrent ? (
        <textarea
          value={node.data.text}
          onChange={onTextChange}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-3xl md:text-4xl leading-relaxed text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={3}
        />
      ) : (
        <p className="text-3xl md:text-4xl leading-relaxed">
          {node.data.text}
        </p>
      )}
    </div>
  );
};

export default PrompterLine;
