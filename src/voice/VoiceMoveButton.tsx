import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Move } from 'chess.js';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { useGameSkin, SkinButton, SkinPanel } from '../components/GameChrome';
import { parseSpokenMove } from './parseSpokenMove';

type Props = {
  legalMoves: Move[];
  onMove: (from: Move['from'], to: Move['to'], promotion?: 'q' | 'r' | 'b' | 'n') => void;
  disabled?: boolean;
};

export default function VoiceMoveButton({ legalMoves, onMove, disabled }: Props) {
  const skin = useGameSkin();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [candidates, setCandidates] = useState<Move[] | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);

  // Subscribed by hand (once, in an effect) instead of via the library's convenience
  // hook. A community hook that re-subscribes on every render, or that replays a
  // buffered event synchronously the moment it is called, can end up updating this
  // component's state WHILE a different component (the game screen) is still in the
  // middle of rendering -- which React does not allow. Subscribing here, inside
  // useEffect with an empty dependency list, guarantees it only ever happens after
  // React has fully finished rendering everything for this pass.
  useEffect(() => {
    const finish = (text: string) => {
      if (!text) return;
      const r = parseSpokenMove(text, legalMovesRef.current);
      if (r.kind === 'match') { onMoveRef.current(r.move.from, r.move.to, r.move.promotion as any); setNotFound(null); }
      else if (r.kind === 'ambiguous') setCandidates(r.candidates);
      else setNotFound(text);
    };
    let lastTranscript = '';
    const subs = [
      ExpoSpeechRecognitionModule.addListener('start', () => setListening(true)),
      ExpoSpeechRecognitionModule.addListener('result', (e: any) => {
        lastTranscript = e.results?.[0]?.transcript ?? '';
        setTranscript(lastTranscript);
      }),
      ExpoSpeechRecognitionModule.addListener('error', () => setListening(false)),
      ExpoSpeechRecognitionModule.addListener('end', () => {
        setListening(false);
        finish(lastTranscript);
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  // Event callbacks above are set up once and must always see the LATEST props/state,
  // not whatever they were on the render that created the subscription -- refs solve
  // that without re-subscribing.
  const legalMovesRef = React.useRef(legalMoves);
  legalMovesRef.current = legalMoves;
  const onMoveRef = React.useRef(onMove);
  onMoveRef.current = onMove;

  const start = async () => {
    setNotFound(null);
    setCandidates(null);
    setTranscript('');
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) { setNotFound('Microphone permission is needed for voice moves.'); return; }
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
  };

  const pick = (m: Move) => { onMove(m.from, m.to, m.promotion as any); setCandidates(null); };

  return (
    <>
      <Pressable
        onPress={start}
        disabled={disabled || listening}
        accessibilityLabel="Say your move"
        style={{
          width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
          backgroundColor: listening ? skin.accent : skin.panelBg2, opacity: disabled ? 0.4 : 1,
          borderWidth: skin.premium ? 1 : 0, borderColor: skin.border,
        }}
      >
        <Text style={{ fontSize: 20 }}>🎤</Text>
      </Pressable>

      <Modal visible={listening} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <SkinPanel skin={skin} style={{ width: '80%', gap: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 32 }}>🎙️</Text>
            <Text style={{ color: skin.text, fontSize: 16, fontWeight: '600' }}>Listening...</Text>
            <Text style={{ color: skin.textMuted, fontSize: 15, minHeight: 22 }}>{transcript}</Text>
            <View style={{ marginTop: 4, width: '100%' }}><SkinButton skin={skin} label="Cancel" onPress={() => ExpoSpeechRecognitionModule.stop()} /></View>
          </SkinPanel>
        </View>
      </Modal>

      <Modal visible={!!candidates} transparent animationType="fade" onRequestClose={() => setCandidates(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <SkinPanel skin={skin} style={{ width: '80%', gap: 10 }}>
            <Text style={{ color: skin.text, fontSize: 16, fontWeight: '600' }}>Which one did you mean?</Text>
            {candidates?.map((m) => (
              <SkinButton key={m.san} skin={skin} label={m.san} onPress={() => pick(m)} />
            ))}
            <SkinButton skin={skin} label="Cancel" onPress={() => setCandidates(null)} />
          </SkinPanel>
        </View>
      </Modal>

      <Modal visible={!!notFound} transparent animationType="fade" onRequestClose={() => setNotFound(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <SkinPanel skin={skin} style={{ width: '80%', gap: 10 }}>
            <Text style={{ color: skin.text, fontSize: 16, fontWeight: '600' }}>Didn't catch a legal move</Text>
            <Text style={{ color: skin.textMuted, fontSize: 14 }}>Heard: "{notFound}"</Text>
            <SkinButton skin={skin} primary label="Try again" onPress={() => { setNotFound(null); start(); }} />
            <SkinButton skin={skin} label="Cancel" onPress={() => setNotFound(null)} />
          </SkinPanel>
        </View>
      </Modal>
    </>
  );
}
