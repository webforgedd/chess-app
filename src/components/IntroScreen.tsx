import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSettingsReady } from '../settings';

// The real photo (gold-toned marble king + maths, the version approved as "10/10"),
// with a loading bar paced to fill over about MIN_DISPLAY_MS. It never completes
// before BOTH of these are true:
//   - at least MIN_DISPLAY_MS has passed (so the intro is never a blink-and-miss-it flash)
//   - the real app work is actually done (photo decoded, saved settings loaded)
// Whichever of those finishes later decides when the screen actually fades out.
const KING = require('../../assets/intro-king.jpg');
const IMG_W = 736; // the photo's own real pixel size, so we can size it ourselves
const IMG_H = 1308; // instead of leaning on resizeMode, which was not behaving as expected
const MIN_DISPLAY_MS = 10000;
const CEILING = 96; // never shown as fully done before both real conditions are met

export default function IntroScreen({ onFinish }: { onFinish: () => void }) {
  const settingsReady = useSettingsReady();
  const [imageReady, setImageReady] = useState(false);
  const { width: screenW, height: screenH } = useWindowDimensions();

  // Compute the box ourselves (fit-within, like "contain") from the phone's real
  // dimensions and the photo's own real pixel size -- this can never crop, unlike
  // relying on the resizeMode prop, which was not rendering correctly on this device.
  let imgW = screenW, imgH = (screenW / IMG_W) * IMG_H;
  if (imgH > screenH) { imgH = screenH; imgW = (screenH / IMG_H) * IMG_W; }

  const imageOpacity = useRef(new Animated.Value(0)).current;
  const barProgress = useRef(new Animated.Value(2)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const [percent, setPercent] = useState(2);

  const startedAt = useRef(Date.now()).current;
  const doneRef = useRef(false);
  const imageReadyRef = useRef(false);
  const settingsReadyRef = useRef(false);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { imageReadyRef.current = imageReady; }, [imageReady]);
  useEffect(() => { settingsReadyRef.current = settingsReady; }, [settingsReady]);

  useEffect(() => {
    const id = barProgress.addListener(({ value }: { value: number }) => setPercent(Math.round(value)));

    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true })
    ).start();

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      if (tickTimer.current) clearInterval(tickTimer.current);
      Animated.timing(barProgress, { toValue: 100, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => {
        setTimeout(() => {
          Animated.timing(screenOpacity, { toValue: 0, duration: 350, useNativeDriver: true })
            .start((result: { finished: boolean }) => result.finished && onFinish());
        }, 250);
      });
    };

    // Paced by time toward the ceiling (so it fills predictably over ~10s), but can
    // only actually finish once the real work is also done.
    tickTimer.current = setInterval(() => {
      if (doneRef.current) return;
      const elapsed = Date.now() - startedAt;
      const timeTarget = Math.min(CEILING, (elapsed / MIN_DISPLAY_MS) * CEILING);
      Animated.timing(barProgress, { toValue: timeTarget, duration: 180, easing: Easing.linear, useNativeDriver: false }).start();
      if (elapsed >= MIN_DISPLAY_MS && imageReadyRef.current && settingsReadyRef.current) finish();
    }, 180);

    return () => { barProgress.removeListener(id); if (tickTimer.current) clearInterval(tickTimer.current); };
  }, []);

  const barWidth = barProgress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-80, 260] });

  return (
    <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: screenW, height: screenH, backgroundColor: '#0D0D0D', zIndex: 999 }, { opacity: screenOpacity }]}>
      <View style={{ width: screenW, height: screenH, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.Image
          source={KING}
          style={{ width: imgW, height: imgH, opacity: imageOpacity }}
          onLoadEnd={() => { setImageReady(true); Animated.timing(imageOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }}
        />
      </View>
      <View style={styles.loadingWrap}>
        <Text style={styles.loadingLabel}>Loading...</Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: barWidth }]}>
            <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerX }, { rotate: '20deg' }] }]} />
          </Animated.View>
          <View style={styles.percentWrap}>
            <Text style={styles.percentText}>{percent}%</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { position: 'absolute', left: 40, right: 40, bottom: 90, alignItems: 'center' },
  loadingLabel: { color: 'rgba(230,215,180,0.9)', fontSize: 14, marginBottom: 10, letterSpacing: 0.5 },
  track: {
    width: '100%', height: 26, borderRadius: 13, backgroundColor: 'rgba(20,16,10,0.9)',
    borderWidth: 2, borderColor: 'rgba(210,175,110,0.8)', overflow: 'hidden', justifyContent: 'center',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#d9a441', borderRadius: 13, overflow: 'hidden' },
  shimmer: { position: 'absolute', top: -10, bottom: -10, width: 26, backgroundColor: 'rgba(255,255,255,0.45)' },
  percentWrap: { alignItems: 'center' },
  percentText: { color: '#f7e7bd', fontSize: 12, fontWeight: '700' },
});
