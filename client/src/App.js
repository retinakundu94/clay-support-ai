import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import ReactMarkdown from "react-markdown";
import { FiCopy } from "react-icons/fi";

function formatTime(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const SUGGESTIONS = [
  "What can you do?",
  "How do I integrate Clay with Gmail?",
  "Is there an API?",
  "Who uses Clay?",
  "How do I get started with Clay?",
];

function App() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("clay-chat");
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    localStorage.setItem("clay-chat", JSON.stringify(messages));
  }, [messages]);

  // Typing effect
  useEffect(() => {
    if (loading) setAiThinking(true);
    else setTimeout(() => setAiThinking(false), 400);
  }, [loading]);

  const handleSend = async (customInput) => {
    if (loading) return;
    const text = typeof customInput === "string" ? customInput : input;
    if (!text.trim()) return;

    const newMessages = [
      ...messages,
      {
        sender: "You",
        text: text,
        timestamp: Date.now(),
        avatar: "🧑‍💻",
      },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("http://localhost:5050/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "AI",
            text: data.reply,
            timestamp: Date.now(),
            avatar: "🤖",
          },
        ]);
      } else {
        throw new Error("No reply from server");
      }
    } catch (err) {
      setErrorMsg("Server error. Please try again.");
      setMessages((prev) => [
        ...prev,
        {
          sender: "AI",
          text: "Sorry, something went wrong. [Retry]",
          timestamp: Date.now(),
          avatar: "🤖",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    localStorage.removeItem("clay-chat");
  };

  // Auto-expand textarea
  const textareaRef = useRef(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  // Keyboard shortcuts
  const handleInputKeyDown = (e) => {
    if ((e.key === "Enter" && !e.shiftKey) || ((e.metaKey || e.ctrlKey) && e.key === "Enter")) {
      e.preventDefault();
      handleSend();
    }
  };

  // Copy to clipboard
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Retry on error
  const handleRetry = (msg) => {
    setMessages(messages.slice(0, -1));
    setTimeout(() => handleSend(msg.text), 150);
  };

  return (
    <div className="App">
      <h1>Clay Support AI</h1>
      <div className="chat-box">
        {messages.length === 0 && (
          <div className="empty-state">
            <span>Ask me anything about Clay! 👋</span>
            <div className="suggested-questions">
              {SUGGESTIONS.map((s, i) => (
                <button
                  className="suggestion-btn"
                  key={i}
                  onClick={() => handleSend(s)}
                  tabIndex={0}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`msg-bubble fade-in ${msg.sender === "You" ? "user-msg" : "ai-msg"}`}
          >
            <div className="msg-meta">
              <span className="avatar">{msg.avatar || (msg.sender === "You" ? "🧑‍💻" : "🤖")}</span>
              <strong>{msg.sender}:</strong>
              <span className="timestamp">{formatTime(msg.timestamp)}</span>
            </div>
            <ReactMarkdown>{msg.text}</ReactMarkdown>
            {msg.sender === "AI" && !msg.isError && (
              <button
                className="copy-btn"
                title="Copy"
                onClick={() => handleCopy(msg.text)}
              >
                <FiCopy size={17} />
              </button>
            )}
            {msg.isError && (
              <button
                className="retry-btn"
                onClick={() => handleRetry(msg)}
                title="Retry"
              >
                Retry
              </button>
            )}
          </div>
        ))}
        {aiThinking && (
          <div className="ai-msg loading-spinner fade-in">
            <span className="avatar">🤖</span>
            AI is typing<span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="input-row">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          rows={2}
          placeholder="Ask me anything about Clay..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
      <button onClick={handleClear} className="clear-btn">
        Clear Chat
      </button>
      {errorMsg && (
        <div className="error-msg">{errorMsg}</div>
      )}
    </div>
  );
}

export default App;
