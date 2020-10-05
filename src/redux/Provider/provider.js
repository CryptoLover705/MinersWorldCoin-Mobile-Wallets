// @flow

import React, { PureComponent } from 'react';
import {View, ActivityIndicator} from 'react-native';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { getStore, getPersistor } from '../store';

let store;
let persistor;

class AppStoreProvider extends PureComponent {
  getChildContext() {
    return {
      store,
      persistor
    };
  }

  renderLoading = () => {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>                
          <ActivityIndicator size={"small"} />
      </View>        
    );    
  };

  static childContextTypes = {
    store: PropTypes.shape({}),
    persistor: PropTypes.shape({})
  };

  render() {
    const { children } = this.props;
    
    persistor = persistor || getPersistor();
    store = store || getStore();


    return (
      <Provider store={store}>
        <PersistGate 
            persistor={persistor} 
            loading={this.renderLoading()}
        >
          {children}
        </PersistGate>
      </Provider>
    );
  }
}

export default AppStoreProvider;
