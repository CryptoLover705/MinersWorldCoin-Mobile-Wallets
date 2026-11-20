// @flow

import { persistCombineReducers } from 'redux-persist';
import SecureStorage from '../../utils/SecureStorage';

import {
  wallet,
  password
} from '../modules';

const config = {
  key: 'LIFTED_REDUX_STORE',
  // Preserve the legacy persistence key and migrate its prior plaintext value.
  storage: SecureStorage
};

const appReducer = persistCombineReducers(config, {
  wallet,
  password
});

export default function rootReducer(state, action) {
  return appReducer(state, action);
}
