import { Stack } from 'expo-router';
import WordInfo from './wordInfo';

export default function PageLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false}}>
      <Stack.Screen name="index"/>
      <Stack.Screen name="slidePanel"/>
      <Stack.Screen name="wordInfo"/>
    </Stack>
  );
}
