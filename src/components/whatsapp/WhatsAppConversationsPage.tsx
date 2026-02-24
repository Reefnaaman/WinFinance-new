'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Agent, WhatsAppConversation, WhatsAppMessage } from '@/lib/database.types';

const MAX_OUTREACH_ATTEMPTS = 3;

interface WhatsAppConversationsPageProps {
  dbAgents: Agent[];
}

type ConversationStatusFilter = 'all' | 'active' | 'needs_human' | 'template_sent' | 'meeting_scheduled' | 'not_interested' | 'no_reply' | 'error';

interface ConversationWithLead extends WhatsAppConversation {
  lead_name?: string;
  lead_source?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  queued: { label: 'בתור', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  template_sent: { label: 'נשלח תבנית', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  active: { label: 'שיחה פעילה', color: 'text-green-600', bgColor: 'bg-green-100' },
  meeting_scheduled: { label: 'פגישה נקבעה', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  not_interested: { label: 'לא מעוניין', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  no_reply: { label: 'אין מענה', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  needs_human: { label: 'ממתין לנציג', color: 'text-red-600', bgColor: 'bg-red-100' },
  error: { label: 'שגיאה', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export default function WhatsAppConversationsPage({ dbAgents }: WhatsAppConversationsPageProps) {
  const [conversations, setConversations] = useState<ConversationWithLead[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ConversationStatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Fetch conversations
  useEffect(() => {
    fetchConversations();
  }, [statusFilter]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      // @ts-ignore - Supabase typing issue with whatsapp_conversations table
      let query = supabase
        .from('whatsapp_conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching conversations:', error);
        setConversations([]);
        return;
      }

      const convData = (data || []) as WhatsAppConversation[];

      // Enrich with lead names
      const leadIds = [...new Set(convData.map((c) => c.lead_id))];
      // @ts-ignore - Supabase typing issue with .in() filter
      const { data: leads } = await supabase
        .from('leads')
        .select('id, lead_name, source')
        .in('id', leadIds);

      const leadsArray = (leads || []) as Array<{ id: string; lead_name: string; source: string }>;
      const leadMap = new Map(leadsArray.map((l) => [l.id, l]));
      const enriched: ConversationWithLead[] = convData.map((conv) => ({
        ...conv,
        lead_name: leadMap.get(conv.lead_id)?.lead_name,
        lead_source: leadMap.get(conv.lead_id)?.source,
      }));

      setConversations(enriched);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    setSelectedConvId(conversationId);
    try {
      // @ts-ignore - Supabase typing issue with whatsapp_messages table
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        setMessages([]);
        return;
      }

      setMessages((data || []) as WhatsAppMessage[]);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeFull = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  // Status filter tabs
  const filterTabs: { id: ConversationStatusFilter; label: string; icon: string }[] = [
    { id: 'all', label: 'הכל', icon: '📋' },
    { id: 'needs_human', label: 'ממתין לנציג', icon: '🚨' },
    { id: 'active', label: 'פעילות', icon: '💬' },
    { id: 'template_sent', label: 'ממתין למענה', icon: '📤' },
    { id: 'meeting_scheduled', label: 'פגישה נקבעה', icon: '📅' },
    { id: 'no_reply', label: 'אין מענה', icon: '⏰' },
    { id: 'not_interested', label: 'לא מעוניין', icon: '✋' },
    { id: 'error', label: 'שגיאות', icon: '⚠️' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">שיחות WhatsApp</h2>
        <button
          onClick={() => { fetchConversations(); setSelectedConvId(null); setMessages([]); }}
          className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
        >
          רענן
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 overflow-x-auto">
          <nav className="flex space-x-reverse space-x-1 px-4 py-2" dir="rtl">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setStatusFilter(tab.id); setSelectedConvId(null); setMessages([]); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content: conversation list + message panel */}
        <div className="flex flex-col md:flex-row min-h-[500px]">
          {/* Conversation List */}
          <div className={`${selectedConvId ? 'hidden md:block' : ''} md:w-2/5 border-l border-slate-200 overflow-y-auto max-h-[600px]`}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <span className="text-4xl block mb-3">💬</span>
                <p>אין שיחות להצגה</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {conversations.map((conv) => {
                  const statusConf = STATUS_CONFIG[conv.status] || STATUS_CONFIG.error;
                  const agentName = conv.assigned_agent_id
                    ? dbAgents.find((a) => a.id === conv.assigned_agent_id)?.name
                    : null;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => fetchMessages(conv.id)}
                      className={`w-full text-right px-4 py-3 hover:bg-slate-50 transition-colors ${
                        selectedConvId === conv.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-800 text-sm">
                          {conv.lead_name || conv.phone}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConf.bgColor} ${statusConf.color}`}>
                          {statusConf.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                          {conv.phone}
                          {conv.outreach_attempt > 1 && (
                            <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
                              ניסיון {conv.outreach_attempt}/{MAX_OUTREACH_ATTEMPTS}
                            </span>
                          )}
                        </span>
                        <span>{formatTime(conv.updated_at)}</span>
                      </div>
                      {agentName && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          נציג: {agentName}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Message Panel */}
          <div className="flex-1 flex flex-col">
            {selectedConvId ? (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <button
                      onClick={() => { setSelectedConvId(null); setMessages([]); }}
                      className="md:hidden text-blue-600 text-sm ml-3"
                    >
                      &rarr; חזרה
                    </button>
                    <span className="font-medium text-slate-800">
                      {selectedConv?.lead_name || selectedConv?.phone}
                    </span>
                    {selectedConv && (
                      <>
                        <span className={`mr-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                          STATUS_CONFIG[selectedConv.status]?.bgColor || 'bg-gray-100'
                        } ${STATUS_CONFIG[selectedConv.status]?.color || 'text-gray-600'}`}>
                          {STATUS_CONFIG[selectedConv.status]?.label || selectedConv.status}
                        </span>
                        {selectedConv.outreach_attempt > 1 && (
                          <span className="mr-1 text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">
                            ניסיון {selectedConv.outreach_attempt}/{MAX_OUTREACH_ATTEMPTS}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {selectedConv?.meeting_date && (
                    <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                      פגישה: {formatTimeFull(selectedConv.meeting_date)}
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[450px] bg-gradient-to-b from-slate-50 to-white">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      אין הודעות בשיחה זו
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === 'outbound' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                            msg.direction === 'outbound'
                              ? 'bg-green-100 text-green-900'
                              : 'bg-white border border-slate-200 text-slate-800'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div className={`text-[10px] mt-1 flex items-center gap-1 ${
                            msg.direction === 'outbound' ? 'text-green-600' : 'text-slate-400'
                          }`}>
                            <span>{formatTime(msg.created_at)}</span>
                            {msg.direction === 'outbound' && (
                              <span>
                                {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : msg.status === 'sent' ? '✓' : msg.status === 'failed' ? '✗' : '⏳'}
                              </span>
                            )}
                            {msg.message_type === 'template' && (
                              <span className="bg-green-200 px-1 rounded text-[9px]">תבנית</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <span className="text-5xl block mb-3">💬</span>
                  <p className="text-sm">בחר שיחה מהרשימה</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
