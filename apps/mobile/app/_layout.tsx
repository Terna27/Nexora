import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#08090D" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#08090D',
          },
          headerTintColor: '#00F0FF',
          headerTitleStyle: {
            fontFamily: 'System',
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: '#08090D',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="calculator"
          options={{
            title: '3% Scenario Model',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="assets"
          options={{
            title: 'Supported Assets',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="security"
          options={{
            title: 'Security Architecture',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="auth/login"
          options={{
            title: 'Institutional Login',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="auth/register"
          options={{
            title: 'Register Organization',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </>
  );
}
