import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Send, Loader, AlertCircle, Download, FileText } from 'lucide-react';

interface Excerpt {
  text: string;
  page?: number;
  similarity_score: number;
}

interface MatchedArtifact {
  id: number;
  artifact_id: string;
  name: string;
  artifact_type?: string;
  industry?: string;
  description?: string;
  summary?: string;
  has_file: boolean;
  relevance: number;
  match_reasons: string[];
  matched_terms: string[];
  excerpts: Excerpt[];
}

interface ResultGroup {
  type: string;
  artifacts: MatchedArtifact[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  groups?: ResultGroup[];
  timestamp: Date;
}

const GREETING =
  'Is there anything specific in the repository you are searching? How may I assist you?';

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: GREETING, timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleDownload = async (artifact: MatchedArtifact) => {
    try {
      const blob = await apiClient.downloadArtifactFile(artifact.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = artifact.name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download artifact:', error);
    }
  };

  const handleSendMessage = async (message: string) => {
    const query = message.trim();
    if (!query) return;

    setMessages(prev => [...prev, { role: 'user', content: query, timestamp: new Date() }]);
    setInput('');
    setLoading(true);

    try {
      const data = await apiClient.assistantSearch(query);
      setAiAvailable(true);

      if (!data.total) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `I couldn't find any artifacts matching "${query}". Try different keywords, or tell me more about what you need.`,
            timestamp: new Date(),
          },
        ]);
      } else {
        const summary = (data.groups as ResultGroup[])
          .map(g => `${g.artifacts.length} ${g.type}${g.artifacts.length > 1 ? 's' : ''}`)
          .join(', ');
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `I found ${data.total} matching artifact${data.total > 1 ? 's' : ''} for "${query}" (${summary}). Here is what the repository contains, ordered by type:`,
            groups: data.groups,
            timestamp: new Date(),
          },
          { role: 'assistant', content: 'Is there anything else you would like to look for?', timestamp: new Date() },
        ]);
      }
    } catch (error) {
      console.error('Failed to search repository:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error searching the repository. Please try again.',
          timestamp: new Date(),
        },
      ]);
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
          <p className="text-sm text-yellow-700">Repository search is currently unavailable. Core platform functionality remains available.</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto card mb-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`${msg.groups ? 'max-w-4xl w-full' : 'max-w-2xl'} p-4 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-presales-dark-green text-white'
                  : 'bg-presales-light-green text-presales-text border border-presales-border'
              }`}
            >
              <p className="text-sm">{msg.content}</p>

              {msg.groups?.map(group => (
                <div key={group.type} className="mt-4">
                  <h3 className="text-sm font-semibold mb-2">
                    {group.type} ({group.artifacts.length})
                  </h3>
                  <div className="space-y-3">
                    {group.artifacts.map(art => (
                      <div key={art.id} className="bg-white border border-presales-border rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <FileText size={18} className="mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <a
                                href={`/artifacts/${art.id}`}
                                className="text-sm font-medium underline break-words"
                              >
                                {art.name}
                              </a>
                              <p className="text-xs opacity-70">
                                {[art.artifact_id, art.artifact_type, art.industry].filter(Boolean).join(' • ')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs px-2 py-0.5 rounded bg-presales-light-green border border-presales-border">
                              {Math.round(art.relevance * 100)}% match
                            </span>
                            {art.has_file && (
                              <button
                                onClick={() => handleDownload(art)}
                                title="Download"
                                className="p-1 hover:bg-presales-light-green rounded"
                              >
                                <Download size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 text-xs bg-presales-light-green border border-presales-border rounded p-2">
                          <p className="font-medium">Why it matched</p>
                          <ul className="list-disc ml-4 mt-1 space-y-0.5">
                            {art.match_reasons.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                          {art.matched_terms.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {art.matched_terms.map(term => (
                                <span key={term} className="px-1.5 py-0.5 rounded bg-yellow-200 text-yellow-900">
                                  {term}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {(art.summary || art.description) && (
                          <p className="text-xs mt-2">{art.summary || art.description}</p>
                        )}

                        {art.excerpts.length > 0 && (
                          <div className="mt-2 space-y-2">
                            <p className="text-xs font-medium">Relevant content from the document:</p>
                            {art.excerpts.map((ex, i) => (
                              <blockquote key={i} className="text-xs border-l-2 border-presales-border pl-2 opacity-90 whitespace-pre-wrap">
                                {ex.text}
                                {ex.page ? <span className="opacity-60"> (page {ex.page})</span> : null}
                              </blockquote>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <p className="text-xs mt-2 opacity-50">{msg.timestamp.toLocaleTimeString()}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-presales-light-green text-presales-text p-4 rounded-lg border border-presales-border flex items-center gap-2">
              <Loader size={16} className="animate-spin" />
              <span className="text-sm">Searching the repository...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="card flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
          placeholder="Describe what you are looking for in the repository..."
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
