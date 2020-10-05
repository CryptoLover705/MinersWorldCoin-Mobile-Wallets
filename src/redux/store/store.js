//  @flow

import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { compact } from 'lodash';
import { persistStore } from 'redux-persist';
import { createLogger } from 'redux-logger';

import rootReducer from './reducers';

const middlewares = compact([
  thunk.withExtraArgument()
]);

const store = createStore(
  rootReducer,
  {},
  compose(applyMiddleware(...middlewares))
);

const persistor = persistStore(
  store,
  null,
  () => {
    store.getState();
  }
);

export function getPersistor() {
  return persistor;
}
export function getStore() {
  return store;
}