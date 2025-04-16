import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { auth } from './services/firebaseConfig';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen'; // Pastikan baris ini sesuai
import ChatScreen from './screens/ChatScreen';
import CameraScreen from './screens/CameraScreen';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from './services/notificationServices';

const Stack = createStackNavigator();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const setupApp = async () => {
      try {
        // Prevent splash screen from auto-hiding
        await SplashScreen.preventAutoHideAsync();

        // Check auth state
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
          setUser(currentUser);
          if (currentUser) {
            await registerForPushNotificationsAsync(currentUser.uid);
          }
          setLoading(false);
          await SplashScreen.hideAsync();
        });

        // Set notification handler
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error during app setup:', error);
        setLoading(false);
        await SplashScreen.hideAsync();
      }
    };

    setupApp();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077B6" />
        <Text style={styles.loadingText}>Memuat...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={user ? 'Chat' : 'Login'}>
        {user ? (
          <>
            <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'LaporKang Wali Aja' }} />
            <Stack.Screen name="Camera" component={CameraScreen} options={{ title: 'Kamera' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Masuk' }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Daftar' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E6F0FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#0077B6',
  },
});