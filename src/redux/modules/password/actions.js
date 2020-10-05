// @flow

import { createAction } from 'redux-actions';

export const SET_PASSWORD_VALUES = 'SET_PASSWORD_VALUES';
export const SET_INITIAL_PASSWORD_STATE = 'SET_INITIAL_PASSWORD_STATE';
export const ADD_NEW_PASSWORD = 'ADD_NEW_PASSWORD';

export const fetchPasswordActionCreators = {
    setPasswordValues: createAction(SET_PASSWORD_VALUES),
    setInitialPasswordState: createAction(SET_INITIAL_PASSWORD_STATE),
    addNewPassword: createAction(ADD_NEW_PASSWORD),
};
