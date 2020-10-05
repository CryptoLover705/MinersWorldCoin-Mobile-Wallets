// @flow

import {
    ADD_NEW_WALLET,
    SET_WALLET_VALUES,
    SET_DEFAULT_VALUES,
    UPDATE_WALLET_VALUES,
    UPDATE_ADDRESS_BOOK,
    SET_INITIAL_WALLET_STATE
} from './actions';

export const WALLET = {
    seedPhrase: [],
    title: "",
    transactions: {},
    balance: { confirmed: 0, unconfirmed: 0 },
    receiveAddress: "",
    addresses: {},
    addressBook: [],
    cache: {},
    isCreated: false,
    isMigrated: true,
};

export const DEFAULT = {
    isCreated: false,
    defaultLanguage: "",
};

export default function wallet(state = DEFAULT, action = {}) {
    const { type, payload } = action;

    switch (type) {
        case ADD_NEW_WALLET: {
                return addNewWallet(state, WALLET, payload)
        }
        case SET_WALLET_VALUES: {
            return setWalletValues(state, payload)
        }
        case SET_DEFAULT_VALUES: {
            return setDefaultValues(state, payload)
        }
        case UPDATE_WALLET_VALUES: {
            return updateWalletValues(state, payload)
        }
        case UPDATE_ADDRESS_BOOK: {
            return updateAddressBook(state, payload)
        }
        case SET_INITIAL_WALLET_STATE: {
            return setInitialWalletState(state, payload)
        }
        default:
            return state;
    }
}

function addNewWallet(state, initialWallet, payload) {
    let newState = {...state};
    newState[payload.timestamp] = initialWallet;

    return newState;
}

function setWalletValues(state, payload) {
    let newState = {...state};
    newState[payload.timestamp] = {...newState[payload.timestamp], ...payload};

    return newState;
}

function setDefaultValues(state, payload) {
    return  {...state, ...payload};
}

function updateWalletValues(state, payload) {
    let newState = {...state};
    let newWalletState = newState[payload.timestamp];
    const keys = Object.keys(payload);

    for (var i = 0; i < keys.length; i++) {
        newWalletState = {...newWalletState, [keys[i]]: {...newWalletState[keys[i]], ...payload[keys[i]]}};
    }

    newState[payload.timestamp] = newWalletState;

    return newState;
}

function updateAddressBook(state, payload) {
    let newState = {...state};
    let newWalletState = newState[payload.timestamp];
    newWalletState['addressBook'] = newWalletState.addressBook.concat(payload.addressBook);

    newState[payload.timestamp] = newWalletState;

    return newState;
}

function setInitialWalletState(state, payload) {
    let newState = {...state};

    delete newState[payload.timestamp];

    return newState;
}
