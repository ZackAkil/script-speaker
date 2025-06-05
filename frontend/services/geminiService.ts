
import { ScriptItem } from '../types';

// Base URL for your backend API. 
// If frontend and backend are served from the same origin, this can be empty.
// Otherwise, set to your backend URL e.g., http://localhost:8080 or your Cloud Run URL.
const API_BASE_URL = ''; 

export const parseScriptWithGemini = async (unstructuredScript: string): Promise<ScriptItem[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/parse_script_vertex`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ script: unstructuredScript }),
    });

    if (!response.ok) {
      // Try to parse error message from backend, otherwise use status text
      let errorMessage = `Server error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // Could not parse JSON error, stick with default
        console.warn("Could not parse error response from backend as JSON.", e);
      }
      throw new Error(errorMessage);
    }

    const parsedScriptItems: ScriptItem[] = await response.json();
    
    // Basic validation that the backend returned data in expected format
    if (Array.isArray(parsedScriptItems) && parsedScriptItems.every(item => 
        typeof item.id === 'string' && 
        typeof item.speaker === 'string' && 
        typeof item.dialogue === 'string'
    )) {
      return parsedScriptItems;
    } else {
      console.error("Backend response for parsed script is not in the expected format:", parsedScriptItems);
      throw new Error("Received malformed script data from the server.");
    }

  } catch (error) {
    console.error("Error calling backend to parse script:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to parse script via backend: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the backend for script parsing.");
  }
};
    