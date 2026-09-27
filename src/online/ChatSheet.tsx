import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { radius, useTheme } from '../theme';
import Button from '../components/Button';
import { supabase } from './supabase';
import { Profile } from './types';

type ChatMessage = { id: number; sender: string; body: string; created_at: string };

export default function ChatSheet({
  visible, onClose, gameId, me, names,
}: { visible: boolean; onClose: () => void; gameId: string; me: string; names: Record<string, Profile> }) {
  const t = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let alive = true;
    supabase.from('chat_messages').select('*').eq('game_id', gameId).order('created_at').then(({ data }: any) => {
      if (alive && data) setMessages(data as ChatMessage[]);
    });
    const ch = supabase
      .channel(`chat-${gameId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `game_id=eq.${gameId}` }, (payload: any) => {
        setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new as ChatMessage]));
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [gameId]);

  useEffect(() => {
    if (visible) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length, visible]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');
    const { error } = await supabase.rpc('send_chat', { p_game: gameId, p_body: body });
    setSending(false);
    if (error) setText(body); // put it back so nothing typed is lost
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', flex: 1 }} onTouchEnd={onClose} />
        <View style={{ backgroundColor: t.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, height: '65%', gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>Chat</Text>
            <View style={{ width: 80 }}><Button label="Close" onPress={onClose} /></View>
          </View>

          <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ gap: 8 }}>
            {messages.length === 0 && <Text style={{ color: t.textMuted, fontSize: 14 }}>No messages yet. Say hi!</Text>}
            {messages.map((m) => {
              const mine = m.sender === me;
              return (
                <View key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  {!mine && (
                    <Text style={{ color: t.textMuted, fontSize: 11, marginBottom: 2 }}>
                      {names[m.sender]?.username ?? 'Opponent'}
                    </Text>
                  )}
                  <View style={{ backgroundColor: mine ? t.primary : t.surface2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ color: mine ? t.onPrimary : t.text, fontSize: 15 }}>{m.body}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Message"
              placeholderTextColor={t.textMuted}
              maxLength={300}
              style={{ flex: 1, backgroundColor: t.surface2, color: t.text, borderRadius: 20, paddingHorizontal: 16, height: 44, fontSize: 15 }}
              onSubmitEditing={send}
              returnKeyType="send"
            />
            <View style={{ width: 72 }}><Button primary label="Send" onPress={send} disabled={!text.trim() || sending} /></View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
