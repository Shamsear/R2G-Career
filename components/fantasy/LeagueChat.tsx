'use client';

/**
 * League Chat Component
 * 
 * Real-time chat interface for fantasy league members
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFantasyChat } from '@/hooks/useFantasyChatRealtime';

interface LeagueChatProps {
  leagueId: string;
  teamId: string;
  teamName: string;
}

export default function LeagueChat({ leagueId, teamId, teamName }: LeagueChatProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    isConnected,
    error,
    sendMessage,
    loadMore,
    hasMore
  } = useFantasyChat({ leagueId, initialLimit: 50, enabled: !!leagueId });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !user) return;

    try {
      setSending(true);
      await sendMessage(newMessage.trim(), teamId, user.id || user.uid || '');
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-sm">League Chat</span>
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            title={isConnected ? 'Connected' : 'Connecting...'}
          />
        </div>
        <span className="text-xs text-slate-400">{teamName}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {hasMore && (
          <div className="text-center pb-2">
            <button
              type="button"
              onClick={() => loadMore()}
              disabled={isLoading}
              className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
            >
              Load previous messages
            </button>
          </div>
        )}

        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = user && (msg.user_id === user.id || msg.user_id === user.uid);
            return (
              <div
                key={msg.message_id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[11px] font-medium text-slate-400">
                    {msg.team_name || 'Manager'}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div
                  className={`px-3 py-2 rounded-lg max-w-[80%] text-sm ${
                    isMe
                      ? 'bg-purple-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.message_text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-1.5 bg-red-950/50 border-t border-red-900/50 text-[11px] text-red-400">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}