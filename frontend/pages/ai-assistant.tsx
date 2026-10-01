import React, { useState } from 'react';
import { apiClient } from '@/lib/api';
import { Send, Loader, AlertCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isAiGenerated?: boolean;
  timestamp: Date;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI Assistant. I can help you with analyzing opportunities, recommending artifacts, generating summaries, and answering questions about your presales operations.',
      isAiGenerated: false,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);

  const suggestedQuestions = [
    'Analyze the first opportunity for me',
    'Recommend artifacts for recent opportunities',
    'What are the most reused artifacts?',
    'Generate a summary for the first opportunity',
    'Show opportunities by industry',
  ];

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // For now, provide demo responses
      let response = '';

      if (message.toLowerCase().includes('analyze')) {
        response = 'I\'ve analyzed the top opportunities in your pipeline. The main focus areas are cloud modernization (35% of opportunities) and AI/ML implementations (40%). Key risks include timeline constraints and resource allocation. Recommendation: Prioritize opportunities with existing technical partnerships.';
      } else if (message.toLowerCase().includes('recommend')) {
        response = 'Based on recent opportunities, I recommend these artifacts: 1) Cloud Migration Proposal - applicable to 8 opportunities, 2) Enterprise AI Architecture - matches 5 AI-focused opportunities, 3) Zero Trust Security - relevant for 6 regulated industries. These have the highest relevance scores.';
      } else if (message.toLowerCase().includes('reused')) {
        response = 'The most reused artifacts are: 1) Banking Cloud Reference Architecture (8 uses), 2) Enterprise AI Architecture (7 uses), 3) API Integration Architecture (6 uses). These are core building blocks for your presales processes.';
      } else if (message.toLowerCase().includes('summary')) {
        response = 'Here\'s a comprehensive summary: GlobalBank Digital Transformation is a $5M opportunity in the Finance sector. Key challenge: Legacy systems. Requirements: Cloud migration, API modernization, and analytics platform. Proposed solution: AWS-based microservices architecture. Probability: 75%. Status: Solutioning. Next steps: Technical architecture review and vendor evaluation.';
      } else if (message.toLowerCase().includes('industry')) {
        response = 'Opportunities by industry distribution: Finance (25%), Technology (20%), Healthcare (15%), Manufacturing (15%), Retail (15%), Other (10%). Finance and Technology sectors represent your largest opportunities pool.';
      } else {
        response = 'I can help you with various presales queries. Try asking me to: analyze opportunities, recommend artifacts, show statistics, generate summaries, or answer questions about your pipeline. What would you like to know?';
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        isAiGenerated: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setAiAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {!aiAvailable && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-700">AI service is currently unavailable. Core platform functionality remains available.</p>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto card mb-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl p-4 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-presales-dark-green text-white'
                  : 'bg-presales-light-green text-presales-text border border-presales-border'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
              {msg.isAiGenerated && (
                <p className="text-xs mt-2 opacity-70">🤖 AI Generated</p>
              )}
              <p className="text-xs mt-2 opacity-50">
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-presales-light-green text-presales-text p-4 rounded-lg border border-presales-border flex items-center gap-2">
              <Loader size={16} className="animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Questions */}
      {messages.length === 1 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-presales-text mb-2">Suggested Questions:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="text-left p-3 border border-presales-border rounded-lg hover:bg-presales-light-green transition-all duration-200 text-sm text-presales-text"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="card flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(input)}
          placeholder="Ask me anything about your presales operations..."
          className="flex-1 border border-presales-border rounded-lg px-4 py-2"
          disabled={loading}
        />
        <button
          onClick={() => handleSendMessage(input)}
          disabled={loading || !input.trim()}
          className="bg-presales-dark-green text-white px-6 py-2 rounded-lg font-medium hover:bg-presales-medium-green transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Send size={18} />
          Send
        </button>
      </div>
    </div>
  );
}
