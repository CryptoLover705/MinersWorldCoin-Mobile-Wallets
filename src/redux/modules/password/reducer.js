// @flow

import {
    SET_PASSWORD_VALUES,
    SET_INITIAL_PASSWORD_STATE,
    ADD_NEW_PASSWORD
} from './actions';

export const PASSWORD = {
    useBiometric: false,
    value: "",
};

export const DEFAULT = {
};

export default function password(state = DEFAULT, action = {}) {
    const { type, payload } = action;

    switch (type) {
        case ADD_NEW_PASSWORD: {
                return addNewPassword(state, PASSWORD, payload)
        }
        case SET_PASSWORD_VALUES: {
            return setPasswordValues(state, payload)
        }
        case SET_INITIAL_PASSWORD_STATE: {
            return setInitialPasswordState()
        }
        default:
            return state;
    }
}

function addNewPassword(state, initialPassword, payload) {
    let newState = {...state};
    newState[payload.timestamp] = initialPassword;

    return newState;
}

function setPasswordValues(state, payload) {
    let newState = {...state};
    newState[payload.timestamp] = {...newState[payload.timestamp], ...payload};

    return newState;
}

function setInitialPasswordState() {
    return DEFAULT;
}