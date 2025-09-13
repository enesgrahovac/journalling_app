import React, { useRef, useEffect, useState } from 'react';
import { Send, Bot, User, Lightbulb } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage, type UIMessagePart } from 'ai';
import { JournalEntryData } from './JournalEntry';

interface ChatInterfaceProps {
  entries: JournalEntryData[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ entries }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  const transport = new DefaultChatTransport<UIMessage>({
    api: '/api/chat',
    prepareSendMessagesRequest: ({ messages }) => {
      const mapped = messages.map((m: UIMessage) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.parts
          .filter((p: UIMessagePart<any, any>) => p.type === 'text')
          .map((p: UIMessagePart<any, any>) => (p as any).text as string)
          .join(''),
      }));
      return { body: { messages: mapped } };
    },
  });

  const { messages, status, sendMessage } = useChat({ transport });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = (e.currentTarget.closest('form')) as HTMLFormElement | null;
      form?.requestSubmit();
    }
  };

  const isLoading = status === 'submitted' || status === 'streaming' || status === 'error';
  const hasStreamingAssistant = messages.some((m) => m.role === 'assistant' && m.parts.some((p: any) => (p as any).state === 'streaming'));
  const showThinking = (status === 'submitted' || status === 'streaming') && !hasStreamingAssistant;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage({ text: trimmed });
    setInput('');
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
        {/* Initial greeting if no messages yet */}
        {messages.length === 0 && (
          <div className="flex justify-start">
            <div
              className="max-w-[80%] border-2 border-black p-3 bg-white"
              style={{ boxShadow: '2px 2px 0px #000000' }}
            >
              <div className="flex items-start space-x-2">
                <div className="mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-mono text-sm leading-relaxed">
                    {"Hello! I'm your journal assistant. I can help you explore insights from your journal entries, find patterns in your thoughts, or answer questions about your writing. What would you like to know?"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.map((message: UIMessage) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] border-2 border-black p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white'
              }`}
              style={{ boxShadow: '2px 2px 0px #000000' }}
            >
              <div className="flex items-start space-x-2">
                <div className="mt-0.5">
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1">
                  {message.role === 'assistant' && message.parts.some((p: any) => p.type === 'reasoning') && (
                    <details className="mb-2">
                      <summary className="font-mono text-xs cursor-pointer select-none underline">
                        Show reasoning
                      </summary>
                      <div className="mt-2 p-2 bg-muted/60">
                        <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                          {message.parts
                            .filter((p: UIMessagePart<any, any>) => p.type === 'reasoning')
                            .map((p: UIMessagePart<any, any>, idx: number) => (
                              <span key={idx}>{(p as any).text}</span>
                            ))}
                        </pre>
                      </div>
                    </details>
                  )}

                  <p className="font-mono text-sm leading-relaxed">
                    {message.parts
                      .filter((p: UIMessagePart<any, any>) => p.type === 'text')
                      .map((p: UIMessagePart<any, any>, idx: number) => (
                        <span key={idx}>{(p as any).text}</span>
                      ))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {showThinking && (
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
      {messages.length === 0 && (
        <div className="border-t border-black p-4 bg-muted">
          <div className="flex items-center space-x-2 mb-3">
            <Lightbulb className="w-4 h-4" />
            <span className="font-mono text-sm">Try asking:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setInput(question)}
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
        <form className="flex space-x-2" onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about your journal entries..."
            className="flex-1 border-2 border-black p-2 font-mono text-sm bg-white resize-none"
            rows={2}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 border-2 border-black bg-white hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: '2px 2px 0px #000000' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;