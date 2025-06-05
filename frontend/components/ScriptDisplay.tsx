
import React from 'react';
import { AppScriptItem, Voice } from '../types';

interface ScriptDisplayProps {
  scriptItems: AppScriptItem[];
  speakerVoiceMap: Record<string, string>;
  availableVoices: Voice[];
  currentlyPlayingId: string | null;
  isPlaying: boolean;
  onPlayPause: (itemId: string) => void;
  itemRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

const ScriptDisplay: React.FC<ScriptDisplayProps> = ({ 
  scriptItems, 
  speakerVoiceMap, 
  availableVoices,
  currentlyPlayingId,
  isPlaying,
  onPlayPause,
  itemRefs
}) => {
  if (scriptItems.length === 0) {
    return (
      <div className="mt-8 text-center text-slate-400">
        <p>No script items to display. Try parsing a script!</p>
      </div>
    );
  }

  const getVoiceDisplayName = (speaker: string) => {
    const voiceName = speakerVoiceMap[speaker];
    if (!voiceName) return <span className="text-xs text-slate-400 italic">No voice selected</span>;
    const voice = availableVoices.find(v => v.name === voiceName);
    return voice ? <span className="text-xs text-indigo-300">{voice.display_name.split('(')[0].trim()}</span> : <span className="text-xs text-red-400 italic">Invalid voice</span>;
  };

  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-4">Parsed Script</h2>
      {scriptItems.map((item) => {
        const isCurrentlyPlayingItem = item.id === currentlyPlayingId;
        const itemHasAudio = !!item.audioSrc;

        return (
          <div 
            key={item.id} 
            ref={el => { itemRefs.current[item.id] = el; }} // Changed: Wrapped assignment in braces
            className={`p-6 rounded-xl shadow-lg transition-all duration-300 ease-in-out
                        ${isCurrentlyPlayingItem && isPlaying ? 'bg-indigo-600 ring-2 ring-indigo-400 shadow-indigo-500/50' : 'bg-slate-700 hover:bg-slate-600'}
                        border ${isCurrentlyPlayingItem && isPlaying ? 'border-indigo-400' : 'border-slate-600'}`}
            aria-live="polite"
            aria-current={isCurrentlyPlayingItem && isPlaying ? "true" : "false"}
          >
            <div className="flex items-start space-x-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-lg
                              ${isCurrentlyPlayingItem && isPlaying ? 'bg-white text-indigo-600' : 'bg-indigo-500 text-white'}`}>
                {item.speaker.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-center">
                    <p className={`text-lg font-bold ${isCurrentlyPlayingItem && isPlaying ? 'text-white' : 'text-indigo-300'}`}>{item.speaker}</p>
                    {getVoiceDisplayName(item.speaker)}
                </div>
                <p className={`mt-1 text-md leading-relaxed ${isCurrentlyPlayingItem && isPlaying ? 'text-indigo-100' : 'text-slate-200'}`}>{item.dialogue}</p>
              </div>
              <div className="flex-shrink-0 flex flex-col items-center space-y-2">
                {item.isGeneratingAudio && (
                  <svg className="animate-spin h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {item.audioError && !item.isGeneratingAudio && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {/* Changed: Moved title prop to a <title> element */}
                    <title>{item.audioError}</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {itemHasAudio && !item.isGeneratingAudio && !item.audioError && (
                  <button
                    onClick={() => onPlayPause(item.id)}
                    aria-label={isCurrentlyPlayingItem && isPlaying ? `Pause ${item.speaker}` : `Play ${item.speaker}`}
                    className={`p-2 rounded-full transition-colors duration-150 
                                ${isCurrentlyPlayingItem && isPlaying ? 'bg-white text-indigo-600 hover:bg-indigo-100' : 'bg-indigo-500 text-white hover:bg-indigo-400'}`}
                  >
                    {isCurrentlyPlayingItem && isPlaying ? (
                      // Pause Icon
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      // Play Icon
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ScriptDisplay;
