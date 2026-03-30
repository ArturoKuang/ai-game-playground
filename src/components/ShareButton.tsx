import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { shareResult } from '../utils/share';

type ShareButtonProps = {
  text: string;
};

export default function ShareButton({ text }: ShareButtonProps) {
  return (
    <Pressable style={styles.button} onPress={() => shareResult(text)}>
      <Text style={styles.label}>Share Result</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#6aaa64',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  label: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
});
