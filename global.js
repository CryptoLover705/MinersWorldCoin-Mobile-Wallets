// Inject node globals into React Native global scope.
global.Buffer = require('buffer').Buffer;
global.process = require('process');
global.process.env.NODE_ENV = __DEV__ ? 'development' : 'production';

// Needed so that 'stream-http' chooses the right default protocol.
global.location = {
  protocol: 'file:',
};

// react-native-get-random-values is loaded before this file in index.js.
// Refuse wallet entropy from that package's Math.random fallback while remote
// debugging; production builds use the native-backed implementation.
if (__DEV__ && typeof global.nativeCallSyncHook === 'undefined' && global.RN$Bridgeless !== true) {
  global.crypto.getRandomValues = () => {
    throw new Error('Secure randomness is unavailable while remote debugging. Disable remote debugging before creating a wallet.');
  };
}