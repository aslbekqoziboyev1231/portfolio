
import React, { useState, useEffect, useRef } from 'react';
import { startAssistantChat } from '../services/geminiService.ts';

interface AIAssistantProps {
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
}

export default function AIAssistant({ isOpen, onToggle }: AIAssistantProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([
    { role: 'assistant', text: 'Greeting Entity. I am Cognify-AI, your primary interface for Cognify. How can I assist your technological trajectory today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInstance = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      if (!chatInstance.current) {
        chatInstance.current = startAssistantChat();
      }
      const result = await chatInstance.current.sendMessage({ message: userMessage });
      setMessages(prev => [...prev, { role: 'assistant', text: result.text || 'Interface error. Connection lost.' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Interference detected. Please restate your query.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end">
      {isOpen && (
        <div className="w-[350px] md:w-[400px] h-[500px] glass rounded-[2.5rem] border-indigo-500/20 mb-6 flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-500">
          <div className="p-8 bg-indigo-600/10 border-b border-gray-800 flex justify-between items-center relative">
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 block">Cognify-AI</span>
                <span className="text-[8px] font-mono text-gray-500 uppercase">Secure Link Active</span>
              </div>
            </div>
            <button onClick={() => onToggle(false)} className="text-gray-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-black/20">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-5 rounded-[2rem] text-xs leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-gray-900/80 border border-gray-800 text-gray-300 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-900/50 p-4 rounded-[1.5rem] flex gap-1 items-center">
                   <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></div>
                   <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
                   <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-6 border-t border-gray-800 bg-black/40">
            <div className="relative">
              <input 
                type="text"
                placeholder="Message Cognify-AI..."
                className="w-full bg-black/60 border border-gray-800 rounded-full px-8 py-4 text-xs text-white focus:border-indigo-500 outline-none pr-14 transition-all"
                value={input}
                onChange={e => setInput(e.target.value)}
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:bg-indigo-500 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
              </button>
            </div>
          </form>
        </div>
      )}

      <button 
        onClick={() => onToggle(!isOpen)}
        className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center transition-all duration-700 shadow-2xl hover:scale-110 active:scale-90 ${isOpen ? 'bg-gray-900 text-indigo-500 rotate-180' : 'bg-indigo-600 text-white'}`}
      >
        {isOpen ? (
           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        ) : (
          <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
        )}
      </button>
    </div>
  );
}
