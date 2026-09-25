import React from 'react';
import { Pressable, Text } from 'react-native';
import { radius, useTheme } from '../theme';

export default function Button({
  label, onPress, primary = false, disabled = false, flex = false,
}: { label: string; onPress: () => void; primary?: boolean; disabled?: boolean; flex?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 48, borderRadius: radius.button, paddingHorizontal: 16,
        alignItems: 'center', justifyContent: 'center', flex: flex ? 1 : undefined,
        backgroundColor: primary ? t.primary : t.surface2,
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ fontSize: 15, fontWeight: '600', color: primary ? t.onPrimary : t.text }}>{label}</Text>
    </Pressable>
  );
}
