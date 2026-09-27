import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import PuzzlesScreen from './src/screens/PuzzlesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import OnlineFlow from './src/screens/OnlineFlow';
import FriendsFlow from './src/screens/FriendsFlow';
import TabBar, { Tab } from './src/components/TabBar';
import { SettingsProvider, useSettingsReady } from './src/settings';
import { useTheme } from './src/theme';
import { Mode, TimeControl } from './src/game/useChessGame';
import IntroScreen from './src/components/IntroScreen';

// Keep the splash screen up until settings have loaded, then fade it out smoothly
// instead of an abrupt cut to the first screen.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 400, fade: true });

type Playing = { mode: Mode; level: number; tc: TimeControl };

function Root() {
  const t = useTheme();
  const settingsReady = useSettingsReady();
  const [tab, setTab] = useState<Tab>('play');
  const [game, setGame] = useState<Playing | null>(null);
  const [review, setReview] = useState<string[] | null>(null);
  const [online, setOnline] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);

  useEffect(() => {
    if (settingsReady) SplashScreen.hideAsync().catch(() => {});
  }, [settingsReady]);

  let body: React.ReactNode;
  if (review) {
    // Review opens over the game; closing it goes back to the board
    body = <ReviewScreen sans={review} onClose={() => setReview(null)} />;
  } else if (online) {
    body = <OnlineFlow onExit={() => setOnline(false)} onReview={setReview} />;
  } else if (friendsOpen) {
    body = <FriendsFlow onExit={() => setFriendsOpen(false)} onReview={setReview} />;
  } else if (game) {
    body = <GameScreen mode={game.mode} level={game.level} tc={game.tc} onExit={() => setGame(null)} onReview={setReview} />;
  } else {
    body = (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {tab === 'play' && <HomeScreen onPlay={(mode, level, tc) => setGame({ mode, level, tc })} onOnline={() => setOnline(true)} />}
          {tab === 'puzzles' && <PuzzlesScreen />}
          {tab === 'profile' && <ProfileScreen focused={tab === 'profile'} onOpenSettings={() => setTab('settings')} onOpenFriends={() => setFriendsOpen(true)} />}
          {tab === 'settings' && <SettingsScreen />}
        </View>
        <TabBar tab={tab} onChange={setTab} />
      </View>
    );
  }
  return <View style={{ flex: 1, backgroundColor: t.bg }}>{body}</View>;
}

export default function App() {
  const [introDone, setIntroDone] = useState(false);
  return (
    <SettingsProvider>
      <StatusBar style="auto" />
      <Root />
      {!introDone && <IntroScreen onFinish={() => setIntroDone(true)} />}
    </SettingsProvider>
  );
}
