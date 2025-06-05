
import { Voice } from '../types';

const API_BASE_URL = ''; // Assuming backend is served from the same origin

export const fetchVoices = async (): Promise<Voice[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/list_voices`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch voices and parse error response' }));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }
    const voices = await response.json();
    // Filter for English voices to simplify, can be removed or adjusted
    // return voices.filter((voice: Voice) => voice.language_code.startsWith('en-'));
    return voices;
  } catch (error) {
    console.error("Error fetching voices:", error);
    throw error;
  }
};

export const generateAudio = async (text: string, voiceName: string, languageCode: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate_audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice_name: voiceName,
        language_code: languageCode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to generate audio and parse error response' }));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error("Error generating audio:", error);
    throw error;
  }
};
