import 'react-native-get-random-values';
import { TextEncoder, TextDecoder } from 'text-encoding';
import { Buffer } from 'buffer';

if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;
if (!global.Buffer) global.Buffer = Buffer;

import './global';

import { Navigation } from 'react-native-navigation';
import { initialNav } from 'src/navigation';
import SocketUtil from 'src/utils/SocketMethodsUtils';
import Config from 'react-native-config';
import LocalizedStrings from 'react-native-localization';
import * as languages from 'src/languages';
import { Platform, LogBox } from 'react-native';

if (Platform.OS === 'android') {
  require('intl');
  require('intl/locale-data/jsonp/en-IN');
}

// Fix warnings
LogBox.ignoreLogs([
  'Setting a timer',
  'Require cycle',
  'AsyncStorage has been extracted'
]);

global.strings = new LocalizedStrings(languages);

const ELECTRUM_SERVERS = [
  "https://api.minersworld.org"
];

global.createSocketConnect = async () => {
  try {

    console.log("Connecting to API server...");

    global.socketConnect = new SocketUtil("https://api.minersworld.org");

    await global.socketConnect.connect();

    console.log("✅ Connected to API");

    global.connectionType = "api";

    // ✅ FIXED HERE
    global.socketConnect.socket.on('connect', () => {
      console.log('🔥 SOCKET CONNECTED');
    });

    global.socketConnect.socket.on('connect_error', (err) => {
      console.log('❌ SOCKET CONNECT ERROR:', err.message);
    });

    global.socketConnect.socket.on('disconnect', () => {
      console.log('⚠️ SOCKET DISCONNECTED');
    });

  } catch (err) {
    console.log("❌ API connection failed:", err.message);
  }
};

global.closeSocketConnect = async () => {
  global.socketConnect.close();
};

Navigation.events().registerAppLaunchedListener(async () => {
  await createSocketConnect();

  // 🔥 WAIT until socket is ACTUALLY connected
  let attempts = 0;

  while ((!global.socketConnect || !global.socketConnect.status()) && attempts < 20) {
    console.log("⏳ Waiting for socket before launching UI...");
    await new Promise(res => setTimeout(res, 500));
    attempts++;
  }

  if (!global.socketConnect || !global.socketConnect.status()) {
    console.log("⚠️ Socket failed, launching anyway...");
  }

  console.log("🚀 Socket ready, launching app");

  initialNav();
});