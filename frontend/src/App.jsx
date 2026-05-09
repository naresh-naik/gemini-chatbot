import React, { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, Image as ImageIcon, Send, Plus, User, Bot, Loader2 } from 'lucide-react'
import './App.css'

const API = 'http://127.0.0.1:5002/api'

export default function App() {
  const [chatId, setChatId] = useState('')
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [uploadedDocName, setUploadedDocName] = useState('')
  const fileRef = useRef()
  const imgRef = useRef()
  const endRef = useRef()

  useEffect(() => { startNewChat() }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isLoading])

  async function startNewChat() {
    setIsLoading(false)
    setIsUploading(false)
    setMessages([])
    setImagePreview('')
    setUploadedDocName('')
    setChatId('')
    if (fileRef.current) fileRef.current.value = ''
    if (imgRef.current) imgRef.current.value = ''
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch(`${API}/chat/new`, { method: 'POST' })
        const data = await res.json()
        if (data.chatId) { setChatId(data.chatId); return }
      } catch {
        await new Promise(r => setTimeout(r, 1000))
      }
    }
    setMessages([{ role: 'bot', content: 'Cannot connect to the backend. Make sure `python app.py` is running, then click **New Chat**.' }])
  }

  async function send(e) {
    e?.preventDefault()
    if (!text.trim() || isLoading) return
    if (!chatId) {
      setMessages(m => [...m, { role: 'bot', content: 'No active session. Click **New Chat**.' }])
      return
    }
    const msg = text.trim()
    setMessages(m => [...m, { role: 'user', content: msg }])
    setIsLoading(true)
    setText('')
    try {
      const res = await fetch(`${API}/chat/${chatId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'bot', content: data.reply || data.error || 'No response.' }])
    } catch {
      setMessages(m => [...m, { role: 'bot', content: 'Cannot reach the server.' }])
    }
    setIsLoading(false)
  }

  async function handleDoc(e) {
    const file = e.target.files[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    setIsUploading(true)
    try {
      const res = await fetch(`${API}/chat/${chatId}/upload-doc`, { method: 'POST', body: form })
      const data = await res.json()
      if (data.success) {
        setUploadedDocName(data.name)
        setMessages(m => [...m, { role: 'bot', content: `Document **${data.name}** uploaded (${data.textLength} chars). Ask me anything about it.` }])
      } else {
        setMessages(m => [...m, { role: 'bot', content: `Upload failed: ${data.error}` }])
      }
    } catch {
      setMessages(m => [...m, { role: 'bot', content: 'Document upload failed.' }])
    }
    setIsUploading(false)
  }

  async function handleImage(e) {
    const file = e.target.files[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    setIsUploading(true)
    try {
      const res = await fetch(`${API}/chat/${chatId}/upload-image`, { method: 'POST', body: form })
      const data = await res.json()
      if (data.preview) {
        setImagePreview(data.preview)
        setMessages(m => [...m, { role: 'bot', content: `Image **${data.name}** uploaded. Ask me anything about it.` }])
      }
    } catch {
      setMessages(m => [...m, { role: 'bot', content: 'Image upload failed.' }])
    }
    setIsUploading(false)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Gemini Chatbot</h1>
        <button onClick={startNewChat} className="new-btn" id="new-chat-btn">
          <Plus size={14} /> New Chat
        </button>
      </header>

      <div className="messages-area" id="messages-area">
        {messages.length === 0 && (
          <div className="empty">
            <h2>What can I help you with?</h2>
            <p>Send a message, upload a document or an image.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <span className="label">
              {m.role === 'user' ? <><User size={12} /> You</> : <><Bot size={12} /> Bot</>}
            </span>
            <div className="bubble">
              {m.role === 'bot'
                ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                : m.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message bot">
            <span className="label"><Bot size={12} /> Bot</span>
            <div className="dots"><span /><span /><span /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="bottom">
        <div className="attachments">
          <label className={`attach-btn ${isUploading ? 'disabled' : ''}`} id="upload-doc-btn">
            {isUploading ? <Loader2 size={13} className="spin" /> : <FileText size={13} />}
            Doc
            <input ref={fileRef} type="file" accept=".pdf,.txt" onChange={handleDoc} hidden disabled={isUploading} />
          </label>
          <label className={`attach-btn ${isUploading ? 'disabled' : ''}`} id="upload-image-btn">
            {isUploading ? <Loader2 size={13} className="spin" /> : <ImageIcon size={13} />}
            Image
            <input ref={imgRef} type="file" accept="image/png,image/jpeg" onChange={handleImage} hidden disabled={isUploading} />
          </label>
          {uploadedDocName && <span className="file-badge"><FileText size={12} /> {uploadedDocName}</span>}
          {imagePreview && <img src={imagePreview} alt="preview" className="img-thumb" />}
        </div>

        <form onSubmit={send} className="composer" id="message-form">
          <input
            id="message-input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Message..."
            disabled={isLoading}
          />
          <button type="submit" className="send-btn" id="send-btn" disabled={isLoading || !text.trim()}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
