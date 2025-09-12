import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Lightbulb } from 'lucide-react';
import { JournalEntryData } from './JournalEntry';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: number;
}

interface ChatInterfaceProps {
  entries: JournalEntryData[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ entries }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your journal assistant. I can help you explore insights from your journal entries, find patterns in your thoughts, or answer questions about your writing. What would you like to know?',
      sender: 'bot',
      timestamp: Date.now() - 1000
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const payloadMessages = [
        { role: 'system', content: 'You are Journal Assistant.' },
        ...messages.map(m => ({ role: m.sender === 'user' ? 'user' as const : 'assistant' as const, content: m.content })),
        { role: 'user', content: newUserMessage.content },
      ];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Chat failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: assistantText || '...',
        sender: 'bot',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const suggestedQuestions = [
    "What patterns do you see in my writing?",
    "How has my mood changed recently?",
    "What insights can you share about my journal?",
    "How many entries do I have?"
  ];

  return (
    <div className="h-full border-2 border-black bg-white flex flex-col">
      {/* Chat window title bar */}
      <div className="border-b-2 border-black p-4 bg-muted">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-black bg-white"></div>
          <span className="font-mono text-sm">Journal Assistant</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] border-2 border-black p-3 ${
                message.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white'
              }`}
              style={{ boxShadow: '2px 2px 0px #000000' }}
            >
              <div className="flex items-start space-x-2">
                <div className="mt-0.5">
                  {message.sender === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-mono text-sm leading-relaxed">
                    {message.content}
                  </p>
                  <p className={`font-mono text-xs mt-2 ${
                    message.sender === 'user' 
                      ? 'text-primary-foreground/70' 
                      : 'text-muted-foreground'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div
              className="border-2 border-black p-3 bg-white max-w-[80%]"
              style={{ boxShadow: '2px 2px 0px #000000' }}
            >
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4" />
                <div className="font-mono text-sm">
                  Thinking<span className="animate-pulse">...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div className="border-t border-black p-4 bg-muted">
          <div className="flex items-center space-x-2 mb-3">
            <Lightbulb className="w-4 h-4" />
            <span className="font-mono text-sm">Try asking:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setInputValue(question)}
                className="text-left p-2 border border-black bg-white hover:bg-accent text-xs font-mono"
              >
                "{question}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t-2 border-black p-4 bg-white">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about your journal entries..."
            className="flex-1 border-2 border-black p-2 font-mono text-sm bg-white resize-none"
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="px-4 py-2 border-2 border-black bg-white hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: '2px 2px 0px #000000' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;