// @flow

import React from 'react';
import { Navigation } from 'react-native-navigation';

import {
    ReceiveScreen,
    WalletScreen,
    SendScreen,
    ScanScreen,
    AddressBookScreen,
    FirstWalletScreen,
    CreateWalletScreen,
    ImportWalletScreen,
    WalletListScreen,
    PasswordScreen,
    GenerateWalletScreen,
    SettingsScreen,
    ConfirmationScreen,
    TransactionDetailsScreen,
    AddAddressScreen,
    AddressInfoScreen,
    AddressListScreen,
    LanguageListScreen,
    ImportKeyScreen
} from 'src/screens';
import { Provider } from 'src/redux';

import {
    RECEIVE_SCREEN,
    WALLET_SCREEN,
    SEND_SCREEN,
    SCAN_SCREEN,
    ADDRESS_BOOK_SCREEN,
    FIRST_WALLET_SCREEN,
    IMPORT_WALLET_SCREEN,
    CREATE_WALLET_SCREEN,
    WALLET_LIST_SCREEN,
    PASSWORD_SCREEN,
    GENERATE_WALLET_SCREEN,
    SETTINGS_SCREEN,
    CONFIRMATION_SCREEN,
    TRANSACTION_DETAILS_SCREEN,
    ADD_ADDRESS_SCREEN,
    ADDRESS_INFO_SCREEN,
    ADDRESS_LIST_SCREEN,
    LANGUAGE_LIST_SCREEN,
    IMPORT_KEY_SCREEN
} from './Screens';

function WrappedComponent(Component) {
    return function inject(props) {
        const EnhancedComponent = () => (
            <Provider>
                    <Component
                        {...props}
                    />
            </Provider>
        );

        return <EnhancedComponent />;
    };
}

export default function () {
    Navigation.registerComponent(RECEIVE_SCREEN, () => WrappedComponent(ReceiveScreen));
    Navigation.registerComponent(WALLET_SCREEN, () => WrappedComponent(WalletScreen));
    Navigation.registerComponent(SEND_SCREEN, () => WrappedComponent(SendScreen));
    Navigation.registerComponent(SCAN_SCREEN, () => WrappedComponent(ScanScreen));
    Navigation.registerComponent(ADDRESS_BOOK_SCREEN, () => WrappedComponent(AddressBookScreen));
    Navigation.registerComponent(ADDRESS_INFO_SCREEN, () => WrappedComponent(AddressInfoScreen));
    Navigation.registerComponent(FIRST_WALLET_SCREEN, () => WrappedComponent(FirstWalletScreen));
    Navigation.registerComponent(CREATE_WALLET_SCREEN, () => WrappedComponent(CreateWalletScreen));
    Navigation.registerComponent(IMPORT_WALLET_SCREEN, () => WrappedComponent(ImportWalletScreen));
    Navigation.registerComponent(WALLET_LIST_SCREEN, () => WrappedComponent(WalletListScreen));
    Navigation.registerComponent(PASSWORD_SCREEN, () => WrappedComponent(PasswordScreen));
    Navigation.registerComponent(GENERATE_WALLET_SCREEN, () => WrappedComponent(GenerateWalletScreen));
    Navigation.registerComponent(SETTINGS_SCREEN, () => WrappedComponent(SettingsScreen));
    Navigation.registerComponent(CONFIRMATION_SCREEN, () => WrappedComponent(ConfirmationScreen));
    Navigation.registerComponent(TRANSACTION_DETAILS_SCREEN, () => WrappedComponent(TransactionDetailsScreen));
    Navigation.registerComponent(ADD_ADDRESS_SCREEN, () => WrappedComponent(AddAddressScreen));
    Navigation.registerComponent(ADDRESS_LIST_SCREEN, () => WrappedComponent(AddressListScreen));
    Navigation.registerComponent(LANGUAGE_LIST_SCREEN, () => WrappedComponent(LanguageListScreen));
    Navigation.registerComponent(IMPORT_KEY_SCREEN, () => WrappedComponent(ImportKeyScreen));
    console.info('All screens have been registered...');
}
