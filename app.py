from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

app = Flask(__name__)
CORS(app)

def find_relevant_docs(query, docs_folder='docs'):
    matches = []
    for filename in os.listdir(docs_folder):
        if filename.endswith(".txt"):
            with open(os.path.join(docs_folder, filename), 'r', encoding='utf-8') as f:
                content = f.read()
                if query.lower() in content.lower():
                    matches.append(content)
    # Join up to 2 matches as context
    return "\n\n".join(matches[:2]) if matches else ""

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message")

    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    # Pull relevant docs for context
    doc_context = find_relevant_docs(user_message)
    system_message = (
        "You are Clay Support AI, a helpful support assistant for Clay (the tech company). "
        "Use ONLY the documentation below to answer the user's question. "
        "Do NOT use any outside knowledge or make up answers. "
        "If the answer is not found in the documentation, say exactly: 'I'm sorry, I couldn't find that information in the docs.'\n\n"
        f"Documentation:\n{doc_context}\n"
    )

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ]
        )
        reply = response["choices"][0]["message"]["content"]
        return jsonify({"reply": reply})

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
