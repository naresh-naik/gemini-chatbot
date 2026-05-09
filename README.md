# Gemini Chatbot

A minimal web-based chatbot powered by Google's Gemini API. Supports text conversation, document upload (PDF/TXT), image upload (PNG/JPG), and session-based chat context.

Built with **React + Vite** (frontend) and **Python + Flask** (backend).

---

## Features

- **Text Chat** — Send messages and receive AI-powered responses from Gemini
- **Document Upload** — Upload PDF or TXT files; the bot uses extracted text to answer questions
- **Image Upload** — Upload PNG or JPG images; the bot can describe and answer questions about them
- **Chat Context** — Conversation history, uploaded documents, and images persist within a session
- **New Chat** — Reset conversation, clear all uploads, and start fresh
- **Image Preview** — See a thumbnail preview of uploaded images
- **Loading Indicators** — Animated typing indicator for bot responses; spinner for file uploads
- **Markdown Rendering** — Bot responses render with proper formatting (bold, lists, code blocks)

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- A **Google Gemini API Key** — [Get one here](https://aistudio.google.com/apikey)

---

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd gemini-chatbot
```

### 2. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Set Gemini API Key

```bash
cp .env.example .env
```

Open `backend/.env` and replace the placeholder with your actual API key:

```
GEMINI_API_KEY=your_actual_api_key_here
PORT=5002
```

### 4. Frontend Setup

```bash
cd ../frontend
npm install
```

---

## Running the App

You need **two terminals** running simultaneously:

### Terminal 1 — Backend (Flask API on port 5002)

```bash
cd backend
source venv/bin/activate      # On Windows: venv\Scripts\activate
python app.py
```

### Terminal 2 — Frontend (Vite dev server on port 5173)

```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## Example Usage

### Document Q&A

1. Click **Upload Doc** and select a PDF or TXT file
2. You'll see a confirmation message with the number of characters extracted
3. Ask: *"Summarize the document"*
4. Follow up: *"What was the third point mentioned?"* — the bot remembers context

### Image Q&A

1. Click **Upload Image** and select a PNG or JPG file
2. A thumbnail preview appears in the controls area
3. Ask: *"What's in the image?"*
4. Follow up: *"Is the person smiling?"* — the bot remembers the uploaded image

### Context Reset

1. Ask: *"What did I upload earlier?"* — the bot will reference your uploaded files
2. Click **New Chat**
3. Ask the same question — the bot will say no files have been uploaded (fresh context)

---

## Tech Stack

| Layer    | Technology                     |
|----------|--------------------------------|
| Frontend | React 18, Vite 5               |
| Backend  | Python, Flask 3.0              |
| AI Model | Google Gemini 2.5 Flash        |
| SDK      | `google-genai` (Python)        |
| Styling  | Vanilla CSS (glassmorphic dark mode) |

---

## Project Structure

```
gemini-chatbot/
├── backend/
│   ├── app.py              # Flask API server
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Environment template
│   └── .env                # Your API key (not committed)
├── frontend/
│   ├── index.html          # HTML entry point
│   ├── package.json        # Node dependencies
│   └── src/
│       ├── main.jsx        # React entry point
│       ├── App.jsx         # Main chat component
│       └── App.css         # Styles
├── .gitignore
└── README.md
```

---

## Notes

- Chat state is stored **in-memory only** — no database. Data resets on server restart.
- No authentication, sessions, or deployment configuration is included.
- Only basic PDF text extraction is used (via PyPDF2). Scanned/image-based PDFs may not work.
- The `.env` file is gitignored. Never commit your API key.
