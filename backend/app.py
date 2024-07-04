import os
import base64
import logging
import time
import re
import json
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from elevenlabs.client import ElevenLabs, VoiceSettings
from dotenv import load_dotenv

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
load_dotenv()

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set in the environment variables")
if not ELEVENLABS_API_KEY:
    raise RuntimeError("ELEVENLABS_API_KEY is not set in the environment variables")

openai_client = OpenAI(api_key=OPENAI_API_KEY)
elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
voice_id = "jsCqWAovK2LkecY7zXl4"

BitHabit_AI_Assistant_v1 = "asst_3REu4vq6lgyXMBXEKFeLulj9" # Custom GPT Assistant ID

def save_thread_id(thread_id):
    try:
        with open('thread_ids.json', 'r+') as file:
            data = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        data = []
    
    if thread_id not in data:
        data.append(thread_id)
        with open('thread_ids.json', 'w') as file:
            json.dump(data, file)

def text_to_speech_stream(text: str) -> BytesIO:
    try:
        response = elevenlabs_client.text_to_speech.convert(
            voice_id=voice_id,
            optimize_streaming_latency="0",
            output_format="mp3_22050_32",
            text=text,
            model_id="eleven_multilingual_v2",
            voice_settings=VoiceSettings(
                stability=0.0,
                similarity_boost=1.0,
                style=0.0,
                use_speaker_boost=True,
            ),
        )
        audio_stream = BytesIO()
        for chunk in response:
            if chunk:
                audio_stream.write(chunk)
        audio_stream.seek(0)
        return audio_stream
    except Exception as e:
        logging.exception("Failed to convert text to speech: %s", e)
        raise

# This is for formatting responses in a easy-to-read way
def general_format_response(response_text):
    formatted_text = re.sub(r"(\d+\.)", r"\n\n\1", response_text).lstrip().rstrip()
    keywords_to_bold = ["Important"]
    for keyword in keywords_to_bold:
        formatted_text = re.sub(f"({keyword})", r"**\1**", formatted_text, flags=re.IGNORECASE)
    return formatted_text

# This is apparently required for the custom GPT API implementation with threading
def handle_tool_calls(required_action):
    tool_outputs = []
    for tool_call in required_action['submit_tool_outputs']['tool_calls']:
        tool_call_id = tool_call['id']
        function_name = tool_call['function']['name']
        args = json.loads(tool_call['function']['arguments'])

        try:
            function = globals().get(function_name)
            if not function:
                raise ValueError(f"No function named {function_name} available.")
            function_response = function(*args) if args else function()
            tool_output = {
                "tool_call_id": tool_call_id,
                "output": json.dumps({"status": "success", "result": function_response})
            }
        except Exception as e:
            tool_output = {
                "tool_call_id": tool_call_id,
                "output": json.dumps({"status": "error", "error": str(e)})
            }
        tool_outputs.append(tool_output)
    return tool_outputs

# This function starts a new thread when a new conversation starts
@app.route('/start', methods=['POST'])
def start_thread():
    try:
        thread = openai_client.beta.threads.create()
        save_thread_id(thread.id)
        return jsonify({"thread_id": thread.id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/threads', methods=['GET'])
def get_threads():
    try:
        with open('thread_ids.json', 'r') as file:
            thread_ids = json.load(file)
        return jsonify({"thread_ids": thread_ids}), 200
    except FileNotFoundError:
        return jsonify({"thread_ids": []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Sends user message into the thread
@app.route('/message', methods=['POST'])
def handle_message():
    data = request.json
    user_message = data.get('message')
    thread_id = data.get('thread_id')
    
    if not user_message or not thread_id:
        return jsonify({"error": "No message or thread ID provided"}), 400
    
    if not thread_id:
        thread = openai_client.beta.threads.create()
        thread_id = thread.id
        save_thread_id(thread_id)
        
    logging.debug('Received user message: %s', user_message)

    try:
        openai_client.beta.threads.messages.create(
            thread_id=thread_id,
            content=user_message,
            role="user"
        )

        run = openai_client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=BitHabit_AI_Assistant_v1
        )

        while True:
            run = openai_client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run.id)
            if run.status == 'completed':
                break
            elif run.status == 'requires_action':
                tool_outputs = handle_tool_calls(run.required_action)
                openai_client.beta.threads.runs.submit_tool_outputs(
                    thread_id=thread_id,
                    run_id=run.id,
                    tool_outputs=tool_outputs
                )
            time.sleep(1)

        messages = openai_client.beta.threads.messages.list(thread_id=thread_id)
        latest_message = messages.data[0].content[0].text.value if messages.data else "No response from Assistant"

        ai_message = general_format_response(latest_message)
        logging.debug('AI response: %s', ai_message)

        try:
            audio_stream = text_to_speech_stream(ai_message)
            audio_base64 = base64.b64encode(audio_stream.read()).decode('utf-8')
        except Exception as error:
            logging.error("Failed to generate speech: %s", error)
            audio_base64 = None

        return jsonify({"reply": ai_message, "audio": audio_base64})
    except Exception as e:
        logging.exception('Error processing message: %s', user_message)
        return jsonify({"error": str(e)}), 500
    
@app.route('/')
def index():
    return 'Flask server is running!'

if __name__ == '__main__':
    print("Starting the server on port 3000...")
    app.run(port=3000, debug=True)
