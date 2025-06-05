
export interface ScriptItem {
  id: string;
  speaker: string;
  dialogue: string;
}

export interface AppScriptItem extends ScriptItem {
  audioSrc?: string;
  isGeneratingAudio?: boolean;
  audioError?: string | null;
}

export interface Voice {
  name: string; // e.g., "en-US-Wavenet-D"
  language_code: string; // e.g., "en-US"
  gender: string; // e.g., "FEMALE", "MALE", "NEUTRAL"
  display_name: string; // User-friendly display name
}
