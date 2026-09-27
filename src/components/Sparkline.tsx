import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Polygon, Polyline, Stop } from 'react-native-svg';

export default function Sparkline({ values, width, height, color = '#e9c46a' }: {
  values: number[]; width: number; height: number; color?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const pad = 6;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y];
  });
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  const last = pts[pts.length - 1];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Polygon points={area} fill="url(#area)" />
      <Polyline points={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={last[0]} cy={last[1]} r={4} fill={color} />
    </Svg>
  );
}
