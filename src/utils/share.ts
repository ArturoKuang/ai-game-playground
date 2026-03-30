import { Share, Platform } from 'react-native';

export async function shareResult(text: string) {
  if (Platform.OS === 'web') {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  } else {
    await Share.share({ message: text });
  }
}
