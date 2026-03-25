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

LogBox.ignoreLogs([
  'Setting a timer',
  'Require cycle:',
  'AsyncStorage has been extracted from react-native core'
]);

global.strings = new LocalizedStrings(languages);

global.createSocketConnect = async () => {
  global.socketConnect = new SocketUtil(Config.IP);
  global.socketConnect.connect();
};

global.closeSocketConnect = async () => {
  global.socketConnect.close();
};

createSocketConnect();

Navigation.events().registerAppLaunchedListener(() => initialNav());