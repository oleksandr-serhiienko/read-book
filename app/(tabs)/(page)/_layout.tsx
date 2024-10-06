import { Stack } from 'expo-router';

export default function PageLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false}}>
      <Stack.Screen name="index"/>
      <Stack.Screen name="slidePanel"/>
    </Stack>
  );
}
