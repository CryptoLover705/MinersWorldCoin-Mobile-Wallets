import './global';

import { Navigation } from 'react-native-navigation';
import { initialNav } from 'src/navigation';
// import ElectrumCli from 'electrum-client';
import SocketUtil from 'src/utils/SocketMethodsUtils';
import Config from 'react-native-config';
import LocalizedStrings from 'react-native-localization';
import * as languages from 'src/languages';
import { Platform, YellowBox } from 'react-native';

if(Platform.OS === 'android') { // only android needs polyfill
  require('intl'); // import intl object
  require('intl/locale-data/jsonp/en-IN'); // load the required locale details
}

YellowBox.ignoreWarnings(['Setting a timer']);

global.strings = new LocalizedStrings(languages);

global.createSocketConnect = async () => {
	global.socketConnect = new SocketUtil(Config.IP);

	// setInterval(() => console.log(global.socketConnect.status()), 5000)
	global.socketConnect.connect()
}

global.closeSocketConnect = async () => {
	global.socketConnect.close()
}

createSocketConnect();

Navigation.events().registerAppLaunchedListener(() => initialNav());
