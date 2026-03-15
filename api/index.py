import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Load API key from .env (stripping whitespace to prevent errors)
API_KEY = os.getenv("API_KEY", "").strip()

@app.route('/chat', methods=['POST'])
def chat():
    """
    Receive user message history and return AI response
    Expected JSON: {"messages": [{"role": "user", "content": "..."}, ...]}
    """
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        if "messages" in data:
            user_history = data["messages"]
            # Get the latest message for quick identity checks
            latest_msg = user_history[-1]["content"].lower() if user_history else ""
        elif "message" in data:
            user_history = [{"role": "user", "content": data["message"]}]
            latest_msg = data["message"].lower()
        else:
            return jsonify({"error": "No message provided"}), 400

        # -------- OWNER BUILT-IN ANSWERS (STRICT RULES) --------
        user_message = latest_msg # latest_msg is already .lower()
        
        OWNER_NAME = "Jampana SubbaNarasimha Reddy"
        OWNER_AGE = "19"

        # -------- NAME QUESTIONS --------
        if (
            "owner name" in user_message or
            "developer name" in user_message or
            "creator name" in user_message or
            "who created you" in user_message or
            "who is the owner" in user_message or
            "who is the developer" in user_message or
            "who built this ai" in user_message
        ):
            return jsonify({"reply": f"The owner and creator of this AI is {OWNER_NAME}."})

        # -------- AGE QUESTIONS --------
        elif (
            "owner age" in user_message or
            "developer age" in user_message or
            "creator age" in user_message or
            "age of the owner" in user_message or
            "how old is the developer" in user_message
        ):
            return jsonify({"reply": f"The owner age is {OWNER_AGE}."})

        # -------- COLLEGE QUESTIONS --------
        elif (
            "owner college" in user_message or 
            "developer college" in user_message or
            "where does the developer study" in user_message or
            "which college" in user_message
        ):
            return jsonify({"reply": "The owner studies B.Tech in Computer Science Engineering with specialization in AI and Machine Learning."})
        # -------------------------------------------------------

        if not API_KEY:
            return jsonify({"reply": "API key not found. Please set API_KEY in .env file."}), 500

        # System prompt for persona
        system_prompt = {
            "role": "system", 
            "content": f"You are Kali AI, a professional and futuristic assistant created by Jampana Subba Narasimha Reddy. You are currently speaking with Jampana Subba Narasimha Reddy. Always refer to him as your owner and address him by name. Be helpful, concise, and professional."
        }

        # Map roles and ensure they are valid for Groq
        mapped_history = []
        for msg in user_history:
            role = msg.get("role", "user")
            # Groq doesn't like 'ai' role, convert to 'assistant'
            if role == "ai":
                role = "assistant"
            mapped_history.append({"role": role, "content": msg.get("content", "")})

        # Combine system prompt with mapped history
        full_messages = [system_prompt] + mapped_history

        # Call Groq API
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.1-8b-instant",
                "messages": full_messages
            },
            timeout=30
        )

        response_data = response.json()

        if "choices" not in response_data:
            print("Groq API Error Response:", response_data)
            return jsonify({"reply": f"AI API error: {response_data.get('error', {}).get('message', 'Unknown error')}"})

        ai_response = response_data["choices"][0]["message"]["content"]

        return jsonify({
            "reply": ai_response
        })

    except Exception as e:
        print("Server Error:", e)
        return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=False, host="0.0.0.0", port=port)