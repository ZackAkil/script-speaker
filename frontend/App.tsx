import React, { useState, useCallback, useEffect, useRef } from "react";
import ScriptInput from "./components/ScriptInput";
import ScriptDisplay from "./components/ScriptDisplay";
import SpeakerVoiceSelector from "./components/SpeakerVoiceSelector";
import { parseScriptWithGemini } from "./services/geminiService";
import { fetchVoices, generateAudio } from "./services/ttsService";
import { ScriptItem, AppScriptItem, Voice } from "./types";

const App: React.FC = () => {
  const [unstructuredScript, setUnstructuredScript] = useState<string>("");
  const [structuredScript, setStructuredScript] = useState<
    AppScriptItem[] | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // For parsing
  const [error, setError] = useState<string | null>(null);

  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState<boolean>(false);
  const [speakerVoiceMap, setSpeakerVoiceMap] = useState<
    Record<string, string>
  >({});
  const [uniqueSpeakers, setUniqueSpeakers] = useState<string[]>([]);

  const [isGeneratingAnyAudio, setIsGeneratingAnyAudio] =
    useState<boolean>(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(
    null
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playQueue, setPlayQueue] = useState<string[]>([]);

  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const loadVoices = async () => {
      setIsLoadingVoices(true);
      try {
        const voices = await fetchVoices();
        setAvailableVoices(voices);
        setError(null);
      } catch (err) {
        if (err instanceof Error) {
          setError(`Failed to load voices: ${err.message}`);
        } else {
          setError("An unknown error occurred while loading voices.");
        }
      } finally {
        setIsLoadingVoices(false);
      }
    };
    loadVoices();
  }, []);

  useEffect(() => {
    if (structuredScript) {
      const speakers = Array.from(
        new Set(structuredScript.map((item) => item.speaker))
      );
      setUniqueSpeakers(speakers);
      // Reset voice map if script changes, or try to preserve if speakers match? For now, reset.
      // setSpeakerVoiceMap({});
    } else {
      setUniqueSpeakers([]);
    }
  }, [structuredScript]);

  const handleParseScript = useCallback(async () => {
    if (!unstructuredScript.trim()) {
      setError("Script input cannot be empty.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setStructuredScript(null);
    setSpeakerVoiceMap({});
    setCurrentlyPlayingId(null);
    setIsPlaying(false);
    setPlayQueue([]);

    try {
      const items: ScriptItem[] = await parseScriptWithGemini(
        unstructuredScript
      );
      setStructuredScript(items.map((item) => ({ ...item }))); // Convert to AppScriptItem
      if (items.length === 0) {
        setError(
          "The AI couldn't find any script items in your text. Try rephrasing or check the input format."
        );
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
      setStructuredScript(null);
    } finally {
      setIsLoading(false);
    }
  }, [unstructuredScript]);

  const handleVoiceChange = (speaker: string, voiceName: string) => {
    setSpeakerVoiceMap((prev) => ({ ...prev, [speaker]: voiceName }));
  };

  const handleGenerateAllAudio = async () => {
    if (!structuredScript) return;
    setIsGeneratingAnyAudio(true);
    setError(null);

    const updatedScript = await Promise.all(
      structuredScript.map(async (item) => {
        const voiceName = speakerVoiceMap[item.speaker];
        const voiceDetails = availableVoices.find((v) => v.name === voiceName);
        if (voiceName && voiceDetails && !item.audioSrc) {
          // Only generate if voice selected and no audio yet
          try {
            setStructuredScript(
              (prev) =>
                prev?.map((s) =>
                  s.id === item.id
                    ? { ...s, isGeneratingAudio: true, audioError: null }
                    : s
                ) || null
            );
            const languageCode = voiceDetails.language_code;
            const audioSrc = await generateAudio(
              item.dialogue,
              voiceName,
              languageCode
            );
            return {
              ...item,
              audioSrc,
              isGeneratingAudio: false,
              audioError: null,
            };
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : "Audio generation failed";
            return {
              ...item,
              isGeneratingAudio: false,
              audioError: errorMessage,
            };
          }
        }
        return item; // Return as is if no voice or audio already exists
      })
    );
    setStructuredScript(updatedScript);
    setIsGeneratingAnyAudio(false);
  };

  const playAudio = (itemId: string) => {
    const item = structuredScript?.find((s) => s.id === itemId);
    if (item?.audioSrc && audioRef.current) {
      if (currentlyPlayingId === itemId && isPlaying) {
        // If it's the current item and playing, pause it
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // Play new item or resume paused current item
        setCurrentlyPlayingId(itemId); // This will trigger useEffect for playing
        if (audioRef.current.src !== item.audioSrc) {
          audioRef.current.src = item.audioSrc;
        }
        audioRef.current
          .play()
          .catch((e) => console.error("Error playing audio:", e));
        setIsPlaying(true);
      }
    }
  };

  useEffect(() => {
    const itemToPlay = structuredScript?.find(
      (s) => s.id === currentlyPlayingId
    );
    if (itemToPlay?.audioSrc && audioRef.current) {
      if (audioRef.current.src !== itemToPlay.audioSrc) {
        audioRef.current.src = itemToPlay.audioSrc;
      }
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          itemRefs.current[itemToPlay.id]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        })
        .catch((e) => {
          console.error("Error playing audio in useEffect:", e);
          setIsPlaying(false);
        });
    } else if (!itemToPlay?.audioSrc && currentlyPlayingId) {
      // If item has no audio, but was set to play (e.g. in queue), move to next
      handleAudioEnded();
    }
  }, [currentlyPlayingId, structuredScript]);

  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (playQueue.length > 0) {
      const nextItemId = playQueue[0];
      setPlayQueue((prev) => prev.slice(1));
      setCurrentlyPlayingId(nextItemId); // This will trigger the useEffect to play
    } else {
      setCurrentlyPlayingId(null); // No more items in queue
    }
  };

  const handlePlayAll = () => {
    if (!structuredScript) return;
    const itemsWithAudio = structuredScript.filter(
      (item) => item.audioSrc && speakerVoiceMap[item.speaker]
    );
    if (itemsWithAudio.length > 0) {
      setPlayQueue(itemsWithAudio.map((item) => item.id));
      setCurrentlyPlayingId(itemsWithAudio[0].id); // Start with the first item
    }
  };

  const canGenerateAudio =
    structuredScript && Object.values(speakerVoiceMap).some((v) => v !== "");
  const canPlayAll =
    structuredScript && structuredScript.some((item) => item.audioSrc);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 py-8 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
            Script Speaker
          </h1>
          <p className="mt-3 text-xl text-slate-300">
            Paste your script, assign voices, and hear it come to life.
          </p>
        </header>

        <main className="bg-slate-800 shadow-2xl rounded-xl p-6 md:p-10">
          <ScriptInput
            script={unstructuredScript}
            onScriptChange={setUnstructuredScript}
            onSubmit={handleParseScript}
            isLoading={isLoading}
          />

          {error && (
            <div className="mt-6 p-4 bg-red-500 border border-red-700 text-white rounded-md shadow-md">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline ml-2">{error}</span>
            </div>
          )}

          {isLoading && !error && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-indigo-500 transition ease-in-out duration-150">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Analyzing your script with AI...
              </div>
            </div>
          )}

          {structuredScript && !isLoading && (
            <>
              <SpeakerVoiceSelector
                speakers={uniqueSpeakers}
                availableVoices={availableVoices}
                speakerVoiceMap={speakerVoiceMap}
                onVoiceChange={handleVoiceChange}
                isLoadingVoices={isLoadingVoices}
              />
              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleGenerateAllAudio}
                  disabled={
                    isGeneratingAnyAudio || !canGenerateAudio || isLoadingVoices
                  }
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                >
                  {isGeneratingAnyAudio ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Generating Audio...
                    </>
                  ) : (
                    "Generate All Audio"
                  )}
                </button>
                <button
                  onClick={handlePlayAll}
                  disabled={
                    isGeneratingAnyAudio ||
                    !canPlayAll ||
                    (isPlaying && playQueue.length > 0)
                  }
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                >
                  {isPlaying && playQueue.length > 0
                    ? "Playing All..."
                    : "Play All Script"}
                </button>
              </div>
              <ScriptDisplay
                scriptItems={structuredScript}
                speakerVoiceMap={speakerVoiceMap}
                availableVoices={availableVoices}
                currentlyPlayingId={currentlyPlayingId}
                isPlaying={isPlaying}
                onPlayPause={playAudio}
                itemRefs={itemRefs}
              />
            </>
          )}
        </main>

        <footer className="text-center mt-12 text-slate-400 text-sm">
          <p>
            &copy; {new Date().getFullYear()} Script Speaker. AI-powered script
            structuring and TTS.
          </p>
        </footer>
      </div>
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
};

export default App;
