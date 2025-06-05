
import React from 'react';
import { Voice } from '../types';

interface SpeakerVoiceSelectorProps {
  speakers: string[];
  availableVoices: Voice[];
  speakerVoiceMap: Record<string, string>;
  onVoiceChange: (speaker: string, voiceName: string) => void;
  isLoadingVoices: boolean;
}

const SpeakerVoiceSelector: React.FC<SpeakerVoiceSelectorProps> = ({
  speakers,
  availableVoices,
  speakerVoiceMap,
  onVoiceChange,
  isLoadingVoices,
}) => {
  if (isLoadingVoices) {
    return <p className="text-slate-300 mt-4">Loading voices...</p>;
  }

  if (speakers.length === 0) {
    return null; // Don't render if no speakers identified
  }

  if (availableVoices.length === 0 && !isLoadingVoices) {
    return <p className="text-red-400 mt-4">No voices available. Please check backend connection.</p>;
  }

  return (
    <div className="mt-8 p-6 bg-slate-700 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold text-white mb-4">Assign Voices to Speakers</h3>
      <div className="space-y-4">
        {speakers.map((speaker) => (
          <div key={speaker} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor={`voice-${speaker}`} className="text-slate-200 mb-1 sm:mb-0 mr-2 font-medium">
              {speaker}:
            </label>
            <select
              id={`voice-${speaker}`}
              value={speakerVoiceMap[speaker] || ''}
              onChange={(e) => onVoiceChange(speaker, e.target.value)}
              className="w-full sm:w-auto bg-slate-600 border border-slate-500 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 transition duration-150 ease-in-out"
              aria-label={`Select voice for ${speaker}`}
            >
              <option value="">-- Select a Voice --</option>
              {availableVoices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.display_name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpeakerVoiceSelector;
