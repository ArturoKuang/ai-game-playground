import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import games from './src/games';

type RootStackParamList = {
  Home: undefined;
  Game: { gameId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.home}>
      <Text style={styles.logo}>Puzzle Lab</Text>
      <Text style={styles.tagline}>Daily brain games for everyone</Text>
      <FlatList
        data={games}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('Game', { gameId: item.id })}
          >
            <Text style={styles.cardEmoji}>{item.emoji}</Text>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
            </View>
            <Text style={styles.cardArrow}>{'\u203a'}</Text>
          </Pressable>
        )}
      />
      <StatusBar style="light" />
    </View>
  );
}

function GameScreen({ route }: any) {
  const game = games.find((g) => g.id === route.params.gameId);
  if (!game) return null;
  const GameComponent = game.component;
  return <GameComponent />;
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#121213' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#121213' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Puzzle Lab' }}
        />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={({ route }: any) => ({
            title: games.find((g) => g.id === route.params.gameId)?.name ?? 'Game',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  home: {
    flex: 1,
    backgroundColor: '#121213',
    paddingTop: 20,
  },
  logo: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 14,
    color: '#818384',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  cardEmoji: {
    fontSize: 32,
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardDesc: {
    fontSize: 13,
    color: '#818384',
    marginTop: 2,
  },
  cardArrow: {
    fontSize: 28,
    color: '#818384',
    marginLeft: 8,
  },
});
