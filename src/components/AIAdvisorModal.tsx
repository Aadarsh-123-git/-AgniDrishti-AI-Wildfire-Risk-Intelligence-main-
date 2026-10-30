import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Bot,
  User,
  ShieldAlert,
  Flame,
  FileText,
  Clock,
} from 'lucide-react';
import { GeographicZone } from '../types';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedZone: GeographicZone | null;
  allZones: GeographicZone[];
}

export const AIAdvisorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedZone,
  allZones,
}) => {
  const [messages, setMessages] = useState<
    Array<{ sender: 'user' | 'ai'; text: string; time: string }>
  >([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeZoneId, setActiveZoneId] = useState<string>(
    selectedZone?.id || allZones[0]?.id || ''
  );

  // Sync selectedZone with activeZoneId
  useEffect(() => {
    if (selectedZone) {
      setActiveZoneId(selectedZone.id);
    }
  }, [selectedZone]);

  // Initial welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          sender: 'ai',
          text: `Greetings Commander. I am WildfireAI Tactical Incident Advisor (Free Demo Mode). Live Gemini API requires a Cloud backend; in this static deployment, pre-computed mitigation strategies, evacuation resource corridors, and situational briefings from the incident matrix are active.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, allZones.length]);

  if (!isOpen) return null;

  const currentZone = allZones.find((z) => z.id === activeZoneId) || selectedZone || allZones[0];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isGenerating) return;

    const userText = inputMessage;
    setInputMessage('');

    const newMessages = [
      ...messages,
      {
        sender: 'user' as const,
        text: userText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setMessages(newMessages);
    setIsGenerating(true);

    try {
      const response = await api.askAIAdvisor(userText, currentZone);
      setMessages([
        ...newMessages,
        {
          sender: 'ai',
          text: response.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          sender: 'ai',
          text: 'AI advisory unavailable in free demo mode. Pre-computed tactical decision matrix: Evacuation routes and firebreak corridors are active.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt);
  };

  return (
    <div className="fixed inset-0 z-[99999] isolate flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
      <div
        id="ai-advisor-modal"
        className="bg-[#111111] border border-white/10 rounded-xl max-w-4xl w-full h-[650px] shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        {/* Header */}
        <div className="bg-[#0a0a0a] px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/5 border border-white/10 rounded flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                WildfireAI Tactical Incident Advisor
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 uppercase tracking-widest">
                  DEMO MODE (SPARK)
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Context-aware emergency mitigation and strategic resource deployment.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Zone Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Focus Sector:</span>
              <select
                value={activeZoneId}
                onChange={(e) => setActiveZoneId(e.target.value)}
                className="bg-[#161616] border border-white/10 rounded px-2 py-1 text-gray-200 text-xs"
              >
                {allZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.id} ({z.riskLevel} - {z.riskScore}%)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs bg-[#0e0e0e]">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[75%] rounded-lg p-3.5 ${
                  msg.sender === 'user'
                    ? 'bg-white text-black font-medium'
                    : 'bg-[#161616] border border-white/5 text-gray-200'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap text-xs">{msg.text}</p>
                <span
                  className={`block text-[9px] mt-2 font-mono ${
                    msg.sender === 'user' ? 'text-gray-600' : 'text-gray-500'
                  }`}
                >
                  {msg.time}
                </span>
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isGenerating && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-[#161616] border border-white/5 rounded-lg p-3 text-xs text-gray-400">
                Analyzing meteorological vectors & generating response...
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Prompts */}
        <div className="px-6 py-2 bg-[#0a0a0a] border-t border-white/5 flex gap-2 overflow-x-auto text-[11px]">
          <button
            type="button"
            onClick={() =>
              handleQuickPrompt(
                `Generate a comprehensive tactical mitigation briefing for Sector ${currentZone?.id} (${currentZone?.name}) with risk ${currentZone?.riskScore}%.`
              )
            }
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 whitespace-nowrap"
          >
            📋 Briefing for {currentZone?.id}
          </button>
          <button
            type="button"
            onClick={() =>
              handleQuickPrompt(
                `What urgent containment firebreak positions should be established given current wind ${currentZone?.weather.windSpeed} km/h toward ${currentZone?.weather.windDirection}?`
              )
            }
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 whitespace-nowrap"
          >
            🔥 Firebreak Strategy
          </button>
          <button
            type="button"
            onClick={() =>
              handleQuickPrompt(
                `Outline a phased civilian evacuation plan for ${currentZone?.population.toLocaleString()} residents in ${currentZone?.id}.`
              )
            }
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 whitespace-nowrap"
          >
            🚗 Evacuation Directives
          </button>
        </div>

        {/* Message Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 bg-[#0a0a0a] border-t border-white/10 flex gap-2"
        >
          <input
            type="text"
            placeholder="Ask AI Incident Advisor for containment tactics, evacuation advice, or risk assessment..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 bg-[#161616] border border-white/10 rounded px-3 py-2 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/30"
          />
          <button
            type="submit"
            disabled={isGenerating || !inputMessage.trim()}
            className="px-4 py-2 bg-white text-black font-bold text-[11px] uppercase tracking-widest rounded hover:bg-gray-200 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
