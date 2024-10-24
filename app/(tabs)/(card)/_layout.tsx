import { Stack } from 'expo-router';

export default function CardLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false}}>
      <Stack.Screen name="index"/>
      <Stack.Screen name="cardPanel" />
      <Stack.Screen name="approvalCard"/>
    </Stack>
  );
}
