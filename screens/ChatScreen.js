// screens/ChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { db, storage, auth } from '../services/firebaseConfig';
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import uuid from 'react-native-uuid';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { Button } from 'react-native-elements';

const ChatScreen = ({ route }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;
  const flatListRef = useRef(null);

  // Handle photo from CameraScreen
  useEffect(() => {
    if (route.params?.photoUri) {
      handleUploadPhoto(route.params.photoUri);
    }
  }, [route.params?.photoUri]);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (message.trim()) {
      setLoading(true);
      try {
        await addDoc(collection(db, 'messages'), {
          text: message,
          createdAt: serverTimestamp(),
          userId: user.uid,
        });
        setMessage('');
      } catch (error) {
        Alert.alert('Error', `Gagal mengirim pesan: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSendLocation = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Izin lokasi ditolak');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      await addDoc(collection(db, 'messages'), {
        type: 'location',
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        createdAt: serverTimestamp(),
        userId: user.uid,
      });
    } catch (error) {
      Alert.alert('Error', `Gagal mengirim lokasi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const pickMedia = async (type, source = 'library') => {
    setLoading(true);
    let result;

    try {
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: true,
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: false,
          quality: 0.7,
        });
      }

      if (!result.canceled) {
        const file = result.assets[0];
        await handleUploadMedia(file.uri, type);
      }
    } catch (error) {
      Alert.alert('Error', `Gagal mengunggah media: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPhoto = async (uri) => {
    setLoading(true);
    try {
      await handleUploadMedia(uri, 'image');
    } catch (error) {
      Alert.alert('Error', `Gagal mengunggah foto: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadMedia = async (uri, type) => {
    try {
      const fileRef = ref(storage, `uploads/${uuid.v4()}`);
      const response = await fetch(uri); // Kembali menggunakan fetch
      const blob = await response.blob();
      await uploadBytes(fileRef, blob);
      const url = await getDownloadURL(fileRef);

      await addDoc(collection(db, 'messages'), {
        type,
        createdAt: serverTimestamp(),
        userId: user.uid,
        mediaUrl: url,
      });
    } catch (error) {
      throw new Error(`Failed to upload media: ${error.message}`);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    Alert.alert('Hapus Pesan', 'Apakah Anda yakin ingin menghapus pesan ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'messages', messageId));
          } catch (error) {
            Alert.alert('Error', `Gagal menghapus pesan: ${error.message}`);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const isMe = item.userId === user.uid;
    const timestamp = item.createdAt?.toDate?.().toLocaleTimeString() || '';

    return (
      <Animatable.View animation={isMe ? 'fadeInRight' : 'fadeInLeft'} duration={500}>
        <TouchableOpacity
          style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}
          onLongPress={() => handleDeleteMessage(item.id)}
        >
          {item.text && <Text style={styles.messageText}>{item.text}</Text>}
          {item.mediaUrl && item.type === 'image' && (
            <Image source={{ uri: item.mediaUrl }} style={styles.image} />
          )}
          {item.mediaUrl && item.type === 'video' && (
            <Text style={styles.messageText}>🎥 Video: {item.mediaUrl}</Text>
          )}
          {item.location && (
            <Text style={styles.messageText}>
              📍 Lokasi: https://maps.google.com/?q={item.location.latitude},{item.location.longitude}
            </Text>
          )}
          <Text style={styles.timestamp}>{timestamp}</Text>
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        inverted
        contentContainerStyle={styles.flatListContent}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0077B6" />
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ketik pesan..."
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Ionicons name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.mediaButtons}>
        <Button
          icon={<Ionicons name="location" size={20} color="white" />}
          title=" Lokasi"
          onPress={handleSendLocation}
          buttonStyle={styles.mediaButton}
        />
        <Button
          icon={<Ionicons name="image" size={20} color="white" />}
          title=" Gambar"
          onPress={() => pickMedia('image')}
          buttonStyle={[styles.mediaButton, { backgroundColor: '#32CD32' }]}
        />
        <Button
          icon={<Ionicons name="videocam" size={20} color="white" />}
          title=" Video"
          onPress={() => pickMedia('video')}
          buttonStyle={[styles.mediaButton, { backgroundColor: '#FFA500' }]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F0FA',
  },
  flatListContent: {
    padding: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 8,
    backgroundColor: 'white',
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    borderRadius: 25,
  },
  sendButton: {
    backgroundColor: '#0077B6',
    padding: 10,
    borderRadius: 25,
    marginRight: 5,
  },
  mediaButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
    marginHorizontal: 10,
  },
  mediaButton: {
    backgroundColor: '#0077B6',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 15,
    marginVertical: 5,
    maxWidth: '80%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  myMessage: {
    backgroundColor: '#32CD32',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#0077B6',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  timestamp: {
    fontSize: 10,
    color: '#ddd',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginTop: 5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;