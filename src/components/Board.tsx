import React from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Chess, Square } from 'chess.js';
import { boardThemes, radius, useTheme } from '../theme';
import { useSettings } from '../settings';
import GlassPiece from './GlassPiece';

// Classic style: filled text glyphs (\uFE0E forces text style, not emoji)
const GLYPH: Record<string, string> = {
  k: '♚\uFE0E', q: '♛\uFE0E', r: '♜\uFE0E', b: '♝\uFE0E', n: '♞\uFE0E', p: '♟\uFE0E',
};
const FILES = 'abcdefgh';

type Props = {
  board: ReturnType<Chess['board']>;
  selected?: Square | null;
  targets?: Square[];
  lastMove?: { from: Square; to: Square } | null;
  hintSquare?: Square | null;
  checkSquare?: Square | null;
  flipped?: boolean;
  onSquarePress?: (sq: Square) => void;
};

export default function Board({
  board, selected = null, targets = [], lastMove = null, hintSquare = null, checkSquare = null,
  flipped = false, onSquarePress = () => {},
}: Props) {
  const t = useTheme();
  const { s } = useSettings();
  const colors = boardThemes[s.boardTheme];
  const { width } = useWindowDimensions();
  const size = Math.min(width - 32, 480);
  const cell = size / 8;
  const rows = flipped ? [...board].reverse() : board;

  return (
    <View style={{ width: size, height: size, borderRadius: radius.board, overflow: 'hidden' }}>
      {rows.map((row, ri) => {
        const cells = flipped ? [...row].reverse() : row;
        return (
          <View key={ri} style={{ flexDirection: 'row' }}>
            {cells.map((piece, ci) => {
              const rank = flipped ? ri + 1 : 8 - ri;
              const file = flipped ? 7 - ci : ci;
              const sq = `${FILES[file]}${rank}` as Square;
              const isLight = (file + rank) % 2 === 1;
              const isSel = selected === sq || hintSquare === sq;
              const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
              const isTarget = targets.includes(sq);
              const label = { position: 'absolute' as const, fontSize: Math.max(9, cell * 0.2), fontWeight: '600' as const,
                color: isLight ? colors.dark : colors.light };
              return (
                <Pressable
                  key={sq}
                  onPress={() => onSquarePress(sq)}
                  accessibilityLabel={`${sq}${piece ? ' ' + piece.type : ''}`}
                  style={{
                    width: cell, height: cell, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isLight ? colors.light : colors.dark,
                    borderWidth: checkSquare === sq ? 3 : 0, borderColor: t.text,
                  }}
                >
                  {(isSel || isLast) && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: isSel ? t.selected : t.lastMove }} />
                  )}
                  {ci === 0 && <Text style={[label, { top: 2, left: 3 }]}>{rank}</Text>}
                  {ri === 7 && <Text style={[label, { bottom: 1, right: 3 }]}>{FILES[file]}</Text>}
                  {piece && (s.pieceStyle !== 'classic' ? (
                    <GlassPiece type={piece.type} color={piece.color} size={cell * 0.94} style={s.pieceStyle as 'glass' | 'royal'} />
                  ) : (
                    <Text style={{ fontSize: cell * 0.78, color: piece.color === 'w' ? '#FFFFFF' : '#111111',
                      textShadowColor: piece.color === 'w' ? '#000' : '#FFF', textShadowRadius: 2,
                      textShadowOffset: { width: 0, height: 0 } }}>
                      {GLYPH[piece.type]}
                    </Text>
                  ))}
                  {isTarget && (
                    <View style={{ position: 'absolute', width: cell * (piece ? 0.9 : 0.28), height: cell * (piece ? 0.9 : 0.28),
                      borderRadius: cell, backgroundColor: piece ? 'transparent' : 'rgba(0,0,0,0.35)',
                      borderWidth: piece ? 3 : 0, borderColor: 'rgba(0,0,0,0.35)' }} />
                  )}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
