import os
import io
import json # Added for JSON parsing
import uuid # Added for generating IDs

from flask import Flask, request, jsonify, send_file, send_from_directory
from google.cloud import texttospeech

# Vertex AI imports
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig

app = Flask(__name__,
            static_folder='frontend/dist/assets',  # Path to React's static assets
            template_folder='frontend/dist'  # Path to React's index.html
)

# Initialize Text-to-Speech client
# This will use Application Default Credentials when running on Cloud Run
try:
    tts_client = texttospeech.TextToSpeechClient()
    print("TextToSpeechClient initialized successfully.")
except Exception as e:
    print(f"Error initializing TextToSpeechClient: {e}")
    tts_client = None

# Initialize Vertex AI and Gemini Model
_gemini_parser_model = None
_vertex_ai_initialized = False
# Model name from the user's JS example to be replicated on the backend
GEMINI_MODEL_FOR_PARSING = "gemini-2.5-flash-preview-04-17" 

vertexai.init()
_gemini_parser_model = GenerativeModel(GEMINI_MODEL_FOR_PARSING)
_vertex_ai_initialized = True


@app.route('/')
def index():
    """Serves the frontend HTML."""
    return send_from_directory(app.template_folder, 'index.html')

@app.route('/<path:path>')
def serve_react_app(path):
    """Serves React app assets or index.html for client-side routing."""
    # This catch-all is important for SPAs like React.
    # If path is not an asset, serve index.html to let React handle routing.
    # Check if the path points to a file in the static_folder first.
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.template_folder, 'index.html')


@app.route('/list_voices', methods=['GET'])
def list_voices_route():
    """Lists available voices from the Google TTS API."""
    if not tts_client:
        return jsonify({"error": "TTS Client not initialized"}), 500

    try:
        response = tts_client.list_voices()
        voices_data = []
        for voice in response.voices:
            voices_data.append({
                "name": voice.name,
                "language_code": voice.language_codes[0],
                "gender": texttospeech.SsmlVoiceGender(voice.ssml_gender).name,
                "display_name": f"{voice.name} ({voice.language_codes[0]}, {texttospeech.SsmlVoiceGender(voice.ssml_gender).name})"
            })
        
        voices_data.sort(key=lambda x: x['name'])
        return jsonify(voices_data)

    except Exception as e:
        app.logger.error(f"Error listing voices: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/generate_audio', methods=['POST'])
def generate_audio_route():
    """Generates audio from text using the selected voice."""
    if not tts_client:
        return jsonify({"error": "TTS Client not initialized"}), 500

    data = request.get_json()
    text_input = data.get('text')
    voice_name = data.get('voice_name')
    language_code = data.get('language_code')

    if not text_input or not voice_name:
        return jsonify({"error": "Missing text or voice_name"}), 400
    
    if not language_code:
        try:
            # Basic derivation, e.g., "en-US-Wavenet-A" -> "en-US"
            language_code = "-".join(voice_name.split('-')[:2])
        except IndexError:
            app.logger.warning(f"Could not derive language_code from voice_name: {voice_name}")
            return jsonify({"error": "Could not derive language_code from voice_name, and it was not provided."}), 400

    app.logger.info(f"Generating audio for text: '{text_input[:30]}...' with voice: {voice_name}, lang: {language_code}")

    synthesis_input = texttospeech.SynthesisInput(text=text_input)
    voice_params = texttospeech.VoiceSelectionParams(
        language_code=language_code,
        name=voice_name
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )

    try:
        response = tts_client.synthesize_speech(
            input=synthesis_input,
            voice=voice_params,
            audio_config=audio_config
        )
        return send_file(
            io.BytesIO(response.audio_content),
            mimetype='audio/mpeg',
            as_attachment=False,
            download_name='speech.mp3'
        )
    except Exception as e:
        app.logger.error(f"Error generating audio: {e}")
        return jsonify({"error": str(e)}), 500

# New route for parsing script with Vertex AI Gemini
@app.route('/parse_script_vertex', methods=['POST'])
def parse_script_vertex_route():
    if not _vertex_ai_initialized or not _gemini_parser_model:
        app.logger.error("Vertex AI model for parsing not initialized. Cannot parse script.")
        return jsonify({"error": "AI Service for script parsing is not available. Please check server logs."}), 503 # Service Unavailable

    data = request.get_json()
    if not data or 'script' not in data:
        return jsonify({"error": "Missing 'script' in request body"}), 400

    unstructured_script = data['script']
    if not isinstance(unstructured_script, str) or not unstructured_script.strip():
        return jsonify({"error": "'script' must be a non-empty string"}), 400

    # This prompt is based on the user-provided JavaScript example logic
    # It asks Gemini for "speaker" and "dialogue"
    prompt = f"""
You are an advanced AI assistant specialized in parsing and structuring text.
Your task is to analyze the provided unstructured script text and convert it into a structured JSON array.
Each element in the array should be an object representing a single piece of dialogue or action attributed to a speaker.
Each object must have two properties:
1. "speaker": A string representing the name or identifier of the character speaking or performing an action. If no speaker is clearly identifiable for a line, you can use "Narrator" or a similar generic term.
2. "dialogue": A string representing the spoken words or a description of the action.

The output MUST be a valid JSON array of these objects and nothing else. Do not include any introductory text, explanations, or markdown formatting around the JSON.

For example, if the input is:
---
Mikey: Hey guys, what's up?
Donny (typing furiously): I'm cracking the mainframe!
Leo: We need a plan.
Raph sighs.
---

The expected JSON output is:
---
[
  {{"speaker": "Mikey", "dialogue": "Hey guys, what's up?"}},
  {{"speaker": "Donny", "dialogue": "I'm cracking the mainframe!"}},
  {{"speaker": "Leo", "dialogue": "We need a plan."}},
  {{"speaker": "Raph", "dialogue": "sighs."}}
]
---

Now, please process the following script text:
>>>
{unstructured_script}
>>>
"""
    # Note: The example JSON within the prompt uses single braces, which is correct for a multiline f-string.
    # Double braces `{{` and `}}` would only be needed if the example itself was part of an f-string interpolation.

    json_string_output_from_gemini = ""  # Initialize for robust error logging
    try:
        generation_config = GenerationConfig(
            temperature=0.2,  # Lower temperature for more deterministic, structured output
            response_mime_type="application/json"  # Request JSON output directly
        )

        # Send prompt to Gemini model
        print(f"Sending prompt to Gemini: {prompt[:200]}...") # Log initial part of prompt
        response = _gemini_parser_model.generate_content(
            contents=[prompt], # Pass prompt as contents list
            generation_config=generation_config,
            # stream=False # Default is False, ensure non-streaming for single JSON output
        )
        
        if not response.candidates or not response.candidates[0].content.parts:
            app.logger.error(f"Gemini response is empty or malformed (no candidates/parts). Full response: {response}")
            return jsonify({"error": "AI service returned an empty or malformed response."}), 500

        # The model is configured to return JSON, so the text part should be a JSON string.
        json_string_output_from_gemini = response.candidates[0].content.parts[0].text
        parsed_from_gemini = json.loads(json_string_output_from_gemini)

        # Validate structure from Gemini (expecting list of dicts with speaker & dialogue)
        if not isinstance(parsed_from_gemini, list):
            app.logger.error(f"Gemini did not return a list as expected. Type: {type(parsed_from_gemini)}. Output: {json_string_output_from_gemini}")
            raise ValueError("AI response was not a list as expected.")

        final_script_items = []
        for item_data in parsed_from_gemini:
            # Validate each item from Gemini
            if not (isinstance(item_data, dict) and
                    'speaker' in item_data and isinstance(item_data['speaker'], str) and
                    'dialogue' in item_data and isinstance(item_data['dialogue'], str)):
                app.logger.warning(f"Skipping invalid item structure from Gemini: {item_data}. Full output: {json_string_output_from_gemini}")
                # For stricter parsing, you might raise ValueError here to fail the entire request.
                # For now, we'll be strict and fail as client expects consistent items.
                raise ValueError("AI response contained an item with invalid structure (missing/wrong type for speaker/dialogue).")
            
            # Add 'id' as expected by the frontend (geminiService.ts validation)
            final_script_items.append({
                "id": str(uuid.uuid4()),
                "speaker": item_data["speaker"],
                "dialogue": item_data["dialogue"]
            })
        
        return jsonify(final_script_items)

    except json.JSONDecodeError as e:
        app.logger.error(f"Failed to decode JSON from Gemini response: {e}. Raw response from Gemini: '{json_string_output_from_gemini}'")
        return jsonify({"error": "Failed to parse script: AI returned malformed JSON data."}), 500
    except ValueError as e: # Catches our custom validation errors
        app.logger.error(f"Data validation error after Gemini call: {e}. Raw Gemini output: '{json_string_output_from_gemini}'")
        return jsonify({"error": str(e)}), 400 # Bad Request, AI content didn't meet expected structure
    except AttributeError as e: # E.g. if response.candidates[0].content.parts[0] path is invalid
        # This usually indicates an issue with the Gemini SDK response structure itself.
        response_obj_for_log = response if 'response' in locals() else 'N/A'
        app.logger.error(f"Unexpected response structure from Gemini SDK: {e}. Full response object: {response_obj_for_log}")
        return jsonify({"error": "AI service returned an unexpected response structure."}), 500
    except Exception as e: # Catch other exceptions, including from Vertex AI API (e.g., google.api_core.exceptions)
        app.logger.error(f"Error during script parsing with Gemini: {type(e).__name__} - {e}")
        # Consider more specific error messages based on type(e) if needed
        return jsonify({"error": f"An error occurred while processing the script with AI: {str(e)}"}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    # debug=True is fine for local development.
    # For Cloud Run, gunicorn will be used (as per common Dockerfile setups) and debug should ideally be False.
    # The Dockerfile/Cloud Run entrypoint usually handles this.
    is_local_run = os.environ.get('RUN_LOCAL') # Example env var to distinguish
    app.run(debug=is_local_run == 'true', host='0.0.0.0', port=port)