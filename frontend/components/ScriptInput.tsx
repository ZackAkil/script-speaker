
import React from 'react';

interface ScriptInputProps {
  script: string;
  onScriptChange: (text: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  placeholder?: string;
}

const ScriptInput: React.FC<ScriptInputProps> = ({ script, onScriptChange, onSubmit, isLoading, placeholder }) => {
  return (
    <div className="w-full">
      <textarea
        value={script}
        onChange={(e) => onScriptChange(e.target.value)}
        placeholder={placeholder || "Paste your unstructured script here...\n\nExample:\nCharacter One: Hello world!\nCharacter Two (excitedly): This is amazing!\nNarrator: And so it began."}
        className="w-full h-64 p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out text-gray-700 resize-y"
        disabled={isLoading}
      />
      <button
        onClick={onSubmit}
        disabled={isLoading || !script.trim()}
        className="mt-4 w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-150 ease-in-out"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Parsing...
          </>
        ) : (
          'Parse Script'
        )}
      </button>
    </div>
  );
};

export default ScriptInput;
