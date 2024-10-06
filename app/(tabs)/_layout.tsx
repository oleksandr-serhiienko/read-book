import { Tabs } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="(home)" options={{
            title: 'Home',
            headerShown: false,
            tabBarIcon: ({ color }) => <FontAwesome size={28} name="home" color={color} />,
        }}/>
      <Tabs.Screen name="(page)" options={{
            title: "Page",
            headerShown: false,
            tabBarIcon: ({ color }) => <FontAwesome size={28} name='book' color={color} />,
            }} />
    </Tabs>
  );
}
