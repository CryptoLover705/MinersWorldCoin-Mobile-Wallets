// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    Alert,
    Image,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import {
    Text,
    Button,
    Input,
    Divider,
} from 'react-native-elements';
import { Navigation } from 'react-native-navigation';
import { responsiveHeight, responsiveWidth } from 'react-native-responsive-dimensions';
import { connectWallet } from 'src/redux';
import { importAddressByWIF, getTransactionHistory, getAddressBalance } from 'src/utils/WalletUtils';

const styles = StyleSheet.create({
    flex: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start'
    },
    buttonIn: {
        backgroundColor: '#ef3b23',
        borderRadius: 25,
    },
    buttonTitleIn: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    buttonTitleOut: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ef3b23'
    },
});

class ImportKeyScreen extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            wif: this.props.wif ? this.props.wif : "",
            loading: false
        };

        Navigation.mergeOptions(this.props.componentId, {
            layout: { backgroundColor: '#fff' },
            statusBar: { visible: true, style: 'dark' },
            topBar: {
                elevation: 0,
                noBorder: true,
                background: { color: 'white' },
            }
        });

        Navigation.events().bindComponent(this);
    }

    sanitizeKey = (key) => {
        return key.trim().replace(/\s+/g, '');
    };

    add = async () => {
        let { wif } = this.state;
        const { updateWalletValues, setWalletValues, wallet, timestamp } = this.props;

        wif = this.sanitizeKey(wif);

        if (!wif) {
            Alert.alert("Error", "Private key is required");
            return;
        }

        const walletData = wallet[timestamp];
        if (!walletData) {
            console.log("IMPORT ERROR: walletData missing", { wallet, timestamp });
            Alert.alert("Error", "Wallet not initialised yet");
            return;
        }

        const safeAddresses = walletData.addresses || {};
        const safeTransactions = walletData.transactions || {};

        this.setState({ loading: true });

        try {
            
            const result = importAddressByWIF(wif);

            if (!result) {
                this.setState({ loading: false });
                Alert.alert("Error", "Invalid private key (WIF)");
                return;
            }

            const { legacy, segwit, bech32 } = result;

            // 🔒 prevent duplicates
            const allNew = [legacy, segwit, bech32].filter(Boolean);
            const alreadyExists = allNew.find(addr => safeAddresses[addr]);

            if (alreadyExists) {
                this.setState({ loading: false });
                Alert.alert("Duplicate", "This wallet/address is already imported");
                return;
            }

            // 🔒 also block keys that are already imported in a DIFFERENT wallet
            const otherTs = Object.keys(wallet).find(ts =>
                String(ts) !== String(timestamp) &&
                wallet[ts] && typeof wallet[ts] === 'object' &&
                wallet[ts].isCreated && wallet[ts].addresses &&
                allNew.some(addr => wallet[ts].addresses[addr])
            );

            if (otherTs) {
                this.setState({ loading: false });
                Alert.alert("Duplicate", "This private key has already been imported in the wallet \"" + wallet[otherTs].title + "\".");
                return;
            }

            Alert.alert(
                "Import Private Key",
                "This will import all address formats (Legacy, SegWit, Bech32). Continue?",
                [
                    { text: "Cancel", style: "cancel", onPress: () => this.setState({ loading: false }) },
                    {
                        text: "Import",
                        onPress: async () => {

                            try {
                                const newAddresses = {};

                                if (legacy) newAddresses[legacy] = { index: 0, privateKey: wif, type: 'legacy' };
                                if (segwit) newAddresses[segwit] = { index: 0, privateKey: wif, type: 'segwit' };
                                if (bech32) newAddresses[bech32] = { index: 0, privateKey: wif, type: 'bech32' };

                                const mergedAddresses = {
                                    ...safeAddresses,
                                    ...newAddresses
                                };

                                const newAddressesByType = {
                                    ...(walletData.addressesByType || {}),
                                    ...(legacy && { legacy }),
                                    ...(segwit && { segwit }),
                                    ...(bech32 && { bech32 })
                                };

                                // ✅ update wallet
                                updateWalletValues({
                                    addresses: mergedAddresses,
                                    addressesByType: newAddressesByType,
                                    isImported: true,
                                    timestamp
                                });

                                // ✅ choose best receive address
                                const currentType =
                                    walletData.addressType ||
                                    this.props.defaultAddressType ||
                                    'bech32';

                                const newReceive =
                                    newAddressesByType[currentType] ||
                                    bech32 ||
                                    segwit ||
                                    legacy;

                                setWalletValues({
                                    receiveAddress: newReceive,
                                    timestamp
                                });

                                // 🔥 refresh transactions
                                const newTransactions = await getTransactionHistory(
                                    global.socketConnect,
                                    mergedAddresses
                                );

                                updateWalletValues({
                                    transactions: newTransactions || {},
                                    timestamp
                                });

                                const mergedTransactions = Object.keys(newTransactions || {}).length
                                    ? newTransactions
                                    : safeTransactions;

                                const balance = await getAddressBalance(mergedTransactions);

                                setWalletValues({
                                    balance: balance || 0,
                                    timestamp
                                });

                                this.setState({ loading: false });

                                Alert.alert("Success", "Private key imported successfully");

                                this.cancel();

                            } catch (err) {
                                console.log("IMPORT FLOW ERROR:", err);
                                this.setState({ loading: false });
                                Alert.alert("Error", "Import failed");
                            }
                        }
                    }
                ]
            );

        } catch (err) {
            console.log("IMPORT ERROR:", err);
            this.setState({ loading: false });
            Alert.alert("Error", "Something went wrong");
        }
    };

    cancel = async () => {
        Navigation.dismissModal(this.props.componentId);
    };

    render() {
        const { loading } = this.state;

        return (
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[styles.flex, { backgroundColor: 'white' }]}>

                    <Image
                        style={{ width: responsiveWidth(20), height: responsiveHeight(12), resizeMode: 'contain' }}
                        source={require('assets/icons/logo.png')}
                    />

                    <Text style={{ fontSize: 20, marginTop: 10, color: 'black' }}>
                        {global.strings['importKey.title']}
                    </Text>

                    <Text style={{ fontSize: 14, color: "gray", textAlign: 'center', marginTop: 10, width: '85%' }}>
                        {global.strings['importKey.subtitle']}
                    </Text>

                    <Divider style={{ marginTop: 10, marginBottom: 10, width: '90%' }} />

                    <Input
                        placeholder={global.strings['importKey.keyInput']}
                        containerStyle={{ width: '90%' }}
                        onChangeText={(wif) => this.setState({ wif })}
                        defaultValue={this.state.wif}
                    />

                    {loading && <Text style={{ marginTop: 10 }}>Importing...</Text>}

                    <View style={{ position: "absolute", bottom: 10, left: 0, right: 0, alignItems: 'center' }}>
                        <Button
                            title={global.strings["importKey.addButton"]}
                            containerStyle={{ width: "90%" }}
                            buttonStyle={styles.buttonIn}
                            titleStyle={styles.buttonTitleIn}
                            onPress={this.add}
                            disabled={loading}
                        />

                        <Button
                            title={global.strings["importKey.cancelButton"]}
                            type='clear'
                            containerStyle={{ width: "90%", marginTop: 10 }}
                            titleStyle={styles.buttonTitleOut}
                            onPress={this.cancel}
                        />
                    </View>
                </View>
            </TouchableWithoutFeedback>
        );
    }
}

ImportKeyScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(ImportKeyScreen);
