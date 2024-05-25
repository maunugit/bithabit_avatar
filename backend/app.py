import os
import base64
import logging
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from elevenlabs.client import ElevenLabs, VoiceSettings

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app)

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set in the environment variables")
if not ELEVENLABS_API_KEY:
    raise RuntimeError("ELEVENLABS_API_KEY is not set in the environment variables")

openai_client = OpenAI(api_key=OPENAI_API_KEY)
elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
voice_id = "jsCqWAovK2LkecY7zXl4"

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

@app.route('/message', methods=['POST'])
def handle_message():
    user_message = request.json.get('message')
    
    if not user_message:
        logging.error('No message provided in request')
        return jsonify({"error": "No message provided"}), 400

    try:
        logging.debug('Received user message: %s', user_message)

        system_message = " Kirjoita maksimissaan 3 viestiä kun vastaat. Olen BitHabit, virtuaalinen assistentti, jonka WellPro on luonut auttamaan sinua kehittämään ja ylläpitämään terveellisiä tapoja. Olen täällä tarjoamassa ohjausta liikuntaan, ravitsemukseen ja yleiseen hyvinvointiin."
        
        
        completion = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ]
        )

        ai_message = completion.choices[0].message.content.strip()
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
