import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Get API Key from environment variable (supports both API_KEY and api-key)
API_KEY = os.getenv("API_KEY") or os.getenv("api-key")

@app.route('/chat', methods=['POST'])
def chat():
    """
    Endpoint to receive user message and return AI response.
    Expects JSON: {"message": "user text"}
    """
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({"error": "No message provided"}), 400

        user_message = data['message']

        # -------------------------------------------------------------------------
        # AI API INTEGRATION LOGIC
        # -------------------------------------------------------------------------
        # This is where YOU plug in your own API endpoint.
        # Example for OpenAI or similar:
        
        # if not API_KEY:
        #     return jsonify({"reply": "Error: API Key not set in environment (API_KEY)."}), 500

        # response = requests.post(
        #     "https://api.openai.com/v1/chat/completions",
        #     headers={"Authorization": f"Bearer {API_KEY}"},
        #     json={
        #         "model": "gpt-3.5-turbo",
        #         "messages": [{"role": "user", "content": user_message}]
        #     },
        #     timeout=30
        # )
        # response_data = response.json()
        # ai_response = response_data['choices'][0]['message']['content']

        # MOCK RESPONSE (Replace with actual API call)
        ai_response = f"I am a professional AI assistant. You said: '{user_message}'. How can I help you build your one-billion-dollar company today?"
        
        # -------------------------------------------------------------------------

        return jsonify({
            "reply": ai_response
        })

    except Exception as e:
        print(f"Server Error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    # Professional Flask setup
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=True, host='0.0.0.0', port=port)






