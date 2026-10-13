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
    // deep copy so wallets never share nested objects (addresses, transactions...)
    const freshWallet = JSON.parse(JSON.stringify(initialWallet));

    return { ...state, [payload.timestamp]: freshWallet };
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
    const { timestamp, ...updates } = payload;

    let newState = { ...state };

    // ✅ ensure wallet exists
    let existingWallet = newState[timestamp] || {
        ...WALLET
    };

    // ✅ merge safely (NO nested spreading madness)
    let newWalletState = {
        ...existingWallet,
        ...updates
    };

    newState[timestamp] = newWalletState;

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
