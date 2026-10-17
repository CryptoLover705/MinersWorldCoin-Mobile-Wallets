// @flow

import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { compact } from 'lodash';
import { persistStore, persistReducer } from 'redux-persist';
import SecureStorage from '../../utils/SecureStorage';

import rootReducer from './reducers';

const middlewares = compact([
  thunk.withExtraArgument()
]);

// Everything persisted (seeds, private keys, PIN) is encrypted at rest;
// the key lives in the Keychain/Keystore. See src/utils/SecureStorage.js
const persistConfig = {
  key: 'root',
  storage: SecureStorage,
};

// ✅ NEW: wrap reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = createStore(
  persistedReducer,
  {},
  compose(applyMiddleware(...middlewares))
);

const persistor = persistStore(store);

// exports stay same
export function getPersistor() {
  return persistor;
}

export function getStore() {
  return store;
}