import React from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Part, SHAPES } from './pieceShapes';
import { BAND, DETAILS, GLASS, ORNAMENTS, ROYAL, Stop as GStop } from './glass';

const stops = (a: GStop[]) => a.map((s, i) => <Stop key={i} offset={s.o} stopColor={s.c} stopOpacity={s.a} />);

function Shape({ p }: { p: Part }) {
  if (p.k === 'p') return <Path d={p.d} />;
  if (p.k === 'c') return <Circle cx={p.cx} cy={p.cy} r={p.r} />;
  return <Rect x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx} />;
}

export type PieceVisualStyle = 'glass' | 'royal';

function GlassPiece({ type, color, size, style = 'glass' }: { type: string; color: 'w' | 'b'; size: number; style?: PieceVisualStyle }) {
  const g = style === 'royal' ? ROYAL[color] : GLASS[color];
  const parts = SHAPES[type];
  const id = `${color}${type}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`f${id}`} gradientUnits="userSpaceOnUse" x1="20" y1="10" x2="80" y2="90">{stops(g.fill)}</LinearGradient>
        <LinearGradient id={`e${id}`} gradientUnits="userSpaceOnUse" x1="20" y1="10" x2="80" y2="90">{stops(g.edge)}</LinearGradient>
        <LinearGradient id={`h${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="62">
          <Stop offset={0} stopColor="#ffffff" stopOpacity={g.gloss} />
          <Stop offset={1} stopColor="#ffffff" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={`s${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="55" x2="0" y2="90">
          <Stop offset={0} stopColor="#2b3540" stopOpacity={0} />
          <Stop offset={1} stopColor="#2b3540" stopOpacity={g.shade} />
        </LinearGradient>
        <ClipPath id={`c${id}`}>{parts.map((p, i) => <Shape key={i} p={p} />)}</ClipPath>
      </Defs>
      <Ellipse cx={52} cy={90} rx={27} ry={4} fill="#000000" opacity={0.3} />
      <G fill={`url(#f${id})`} stroke={`url(#e${id})`} strokeWidth={g.edgeWidth} strokeLinejoin="round">
        {parts.map((p, i) => <Shape key={i} p={p} />)}
      </G>
      <G clipPath={`url(#c${id})`}>
        <Rect x={0} y={0} width={100} height={62} fill={`url(#h${id})`} />
        <Rect x={0} y={55} width={100} height={40} fill={`url(#s${id})`} />
        {style === 'royal' && <Rect x={0} y={BAND.y} width={100} height={BAND.h} fill="#ffffff" opacity={0.5} />}
        <Path d="M31 0 L37 0 L23 100 L17 100 Z" fill="#ffffff" opacity={g.streak} />
        {style === 'royal' && <Path d="M46 0 L49 0 L35 100 L32 100 Z" fill="#ffffff" opacity={g.streak * 0.5} />}
      </G>
      {style === 'glass' && (DETAILS[type] || []).map((d, i) => (
        <Circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={color === 'w' ? '#3b4650' : '#ffffff'} opacity={0.85} />
      ))}
      {style === 'royal' && (ORNAMENTS[type] || []).map((d, i) => (
        <G key={i}>
          <Circle cx={d.cx} cy={d.cy} r={d.r} fill="#8a1620" stroke="#3a2a0d" strokeWidth={0.4} />
          <Circle cx={d.cx - d.r * 0.3} cy={d.cy - d.r * 0.3} r={d.r * 0.35} fill="#ffffff" opacity={0.6} />
        </G>
      ))}
    </Svg>
  );
}

export default React.memo(GlassPiece);
