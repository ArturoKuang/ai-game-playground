import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

type TileProps = {
  color: string;
  label?: string;
  size?: number;
  onPress?: () => void;
  borderColor?: string;
  animated?: boolean;
};

export default function Tile({
  color,
  label,
  size = 56,
  onPress,
  borderColor = '#d3d6da',
}: TileProps) {
  const content = (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderColor,
        },
      ]}
    >
      {label ? (
        <Text style={[styles.label, { fontSize: size * 0.4 }]}>{label}</Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 3,
  },
  label: {
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
});
