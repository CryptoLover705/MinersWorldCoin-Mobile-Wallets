// @flow

import { createAction } from 'redux-actions';

export const ADD_NEW_WALLET = 'ADD_NEW_WALLET';
export const SET_WALLET_VALUES = 'SET_WALLET_VALUES';
export const SET_DEFAULT_VALUES = 'SET_DEFAULT_VALUES';
export const SET_INITIAL_WALLET_STATE = 'SET_INITIAL_WALLET_STATE';
export const UPDATE_WALLET_VALUES = 'UPDATE_WALLET_VALUES';
export const UPDATE_ADDRESS_BOOK = 'UPDATE_ADDRESS_BOOK';

export const fetchWalletActionCreators = {
    addNewWallet: createAction(ADD_NEW_WALLET),
    setWalletValues: createAction(SET_WALLET_VALUES),
    setDefaultValues: createAction(SET_DEFAULT_VALUES),
    updateWalletValues: createAction(UPDATE_WALLET_VALUES),
    updateAddressBook: createAction(UPDATE_ADDRESS_BOOK),
    setInitialWalletState: createAction(SET_INITIAL_WALLET_STATE)
};
