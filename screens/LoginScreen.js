// screens/LoginScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebaseConfig'; // Path relatif dari screens/
import { Button } from 'react-native-elements';
import * as Animatable from 'react-native-animatable';

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        navigation.replace('Chat');
      }
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', `Gagal masuk: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Animatable.Text animation="fadeInDown" style={styles.title}>
        Selamat Datang di LaporKang Wali Aja
      </Animatable.Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0077B6" />
      ) : (
        <Animatable.View animation="fadeInUp" style={styles.buttonContainer}>
          <Button
            title="Masuk sebagai Tamu"
            onPress={handleLogin}
            buttonStyle={styles.button}
            titleStyle={styles.buttonText}
          />
        </Animatable.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#32CD32',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '80%',
  },
  button: {
    backgroundColor: '#0077B6',
    paddingVertical: 15,
    borderRadius: 25,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});