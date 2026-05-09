import os
import uuid
import base64
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types
import PyPDF2
from io import BytesIO

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configure Gemini client
api_key = os.getenv("GEMINI_API_KEY", "").strip().strip('"').strip("'")
print(f"API Key loaded: {'YES (' + api_key[:8] + '...' + api_key[-4:] + ')' if api_key else 'NO - set GEMINI_API_KEY in .env'}")

client = None
if api_key:
    try:
        client = genai.Client(api_key=api_key)
        print("Gemini client initialized successfully")
    except Exception as e:
        print(f"Failed to initialize Gemini client: {e}")

# In-memory store
chats = {}

@app.route('/api/chat/new', methods=['POST'])
def new_chat():
    chat_id = str(uuid.uuid4())
    chats[chat_id] = {
        'messages': [],
        'docText': '',
        'docName': '',
        'imageBase64': '',
        'imageMime': ''
    }
    print(f"New chat created: {chat_id}")
    return jsonify({'chatId': chat_id})

@app.route('/api/chat/<chat_id>/upload-doc', methods=['POST'])
def upload_doc(chat_id):
    if chat_id not in chats:
        return jsonify({'error': 'chat not found'}), 404
    
    if 'file' not in request.files:
        return jsonify({'error': 'no file'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'no file selected'}), 400
        
    text = ''
    try:
        if file.mimetype == 'application/pdf':
            reader = PyPDF2.PdfReader(BytesIO(file.read()))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        elif file.mimetype == 'text/plain':
            text = file.read().decode('utf-8')
        else:
            return jsonify({'error': 'unsupported file type'}), 400
        
        text = text.strip()
        print(f"Document '{file.filename}' uploaded: {len(text)} chars extracted")
        
        if not text:
            return jsonify({'error': 'Could not extract text from this PDF. It may be a scanned/image-based PDF.'}), 400
            
        chats[chat_id]['docText'] = text
        chats[chat_id]['docName'] = file.filename
        return jsonify({'success': True, 'name': file.filename, 'textLength': len(text)})
    except Exception as e:
        print(f"Doc upload error: {e}")
        return jsonify({'error': 'upload failed'}), 500

@app.route('/api/chat/<chat_id>/upload-image', methods=['POST'])
def upload_image(chat_id):
    if chat_id not in chats:
        return jsonify({'error': 'chat not found'}), 404
        
    if 'file' not in request.files:
        return jsonify({'error': 'no file'}), 400
        
    file = request.files['file']
    if file.mimetype not in ['image/png', 'image/jpeg']:
        return jsonify({'error': 'unsupported image type'}), 400
        
    try:
        file_bytes = file.read()
        b64 = base64.b64encode(file_bytes).decode('utf-8')
        chats[chat_id]['imageBase64'] = b64
        chats[chat_id]['imageMime'] = file.mimetype
        
        data_url = f"data:{file.mimetype};base64,{b64}"
        return jsonify({'success': True, 'preview': data_url, 'name': file.filename})
    except Exception as e:
        print(f"Image upload error: {e}")
        return jsonify({'error': 'image upload failed'}), 500

@app.route('/api/chat/<chat_id>/message', methods=['POST'])
def send_message(chat_id):
    if chat_id not in chats:
        # Auto-create the chat if not found (handles server restarts)
        print(f"Chat {chat_id} not found, creating new one")
        chats[chat_id] = {
            'messages': [],
            'docText': '',
            'docName': '',
            'imageBase64': '',
            'imageMime': ''
        }
        
    data = request.json
    message = data.get('message', '')
    
    chat = chats[chat_id]
    chat['messages'].append({'role': 'user', 'content': message})
    
    # Build system instruction
    system_instruction = "You are a helpful AI assistant."
    if chat.get('docText'):
        doc_name = chat.get('docName', 'uploaded document')
        system_instruction = (
            f"You are a helpful AI assistant. The user has uploaded a document named '{doc_name}'. "
            f"Below is the full text content extracted from that document. Use this content to answer the user's questions about the document.\n\n"
            f"=== DOCUMENT CONTENT START ===\n{chat['docText']}\n=== DOCUMENT CONTENT END ==="
        )
    
    # Build conversation history
    contents = []
    recent = chat['messages'][-10:]
    for m in recent:
        role = "user" if m['role'] == 'user' else "model"
        msg_parts = [types.Part.from_text(text=m['content'])]
        contents.append(types.Content(role=role, parts=msg_parts))
    
    # Attach image to the latest user message if present
    if chat.get('imageBase64') and contents:
        contents[-1].parts.append(
            types.Part.from_bytes(
                data=base64.b64decode(chat['imageBase64']),
                mime_type=chat['imageMime']
            )
        )
        
    try:
        if not client:
            reply = "⚠️ **No API key configured.** Please add a valid `GEMINI_API_KEY` to `backend/.env` and restart the server."
        else:
            print(f"Sending message to Gemini (model: gemini-2.5-flash, parts: {len(contents)})")
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )
            reply = response.text
            print(f"Gemini response received: {len(reply)} chars")
    except Exception as e:
        error_msg = str(e)
        print(f"Gemini error: {error_msg}")
        traceback.print_exc()
        
        # Return the actual error to the user so they can debug
        if "API key" in error_msg:
            reply = f"❌ **API Key Error**: Your Gemini API key is invalid. Please check `backend/.env`.\n\nError: {error_msg}"
        elif "not found" in error_msg or "not available" in error_msg:
            reply = f"❌ **Model Error**: The model is not available. Error: {error_msg}"
        else:
            reply = f"❌ **Gemini Error**: {error_msg}"
        
    chat['messages'].append({'role': 'bot', 'content': reply})
    return jsonify({'reply': reply})

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5002))
    print(f"Starting server on port {port}...")
    app.run(port=port)
