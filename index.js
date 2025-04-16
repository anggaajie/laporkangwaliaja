// index.js
import 'react-native-url-polyfill'; // Impor polyfill di awal
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

console.log('Registering app with name:', appName);

// Daftarkan komponen utama aplikasi React Native
AppRegistry.registerComponent(appName, () => App);