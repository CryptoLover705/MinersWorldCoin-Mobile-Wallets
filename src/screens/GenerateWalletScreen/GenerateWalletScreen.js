// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    Image,
    ActivityIndicator,
    AppState,
    Alert
} from 'react-native';
import {
    Text
} from 'react-native-elements';
import { pushWalletList } from 'src/navigation';
import { Navigation } from 'react-native-navigation';
import Config from 'react-native-config';
import { discoverSeedAddresses, generateAddresses, generateAddressesFromWIF, getBalance, getTransactionHistory } from 'src/utils/WalletUtils';
import { connectWallet, connectPassword } from 'src/redux';

const styles = StyleSheet.create({
    flex: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start'
    },
    buttonsContainer: {
        flexDirection: 'row',
        alignContent: 'space-between',
    },
    basicContainer: {
        padding: 10,
        paddingTop: 15,
        paddingBottom: 5,
        backgroundColor: '#202225',
        borderRadius: 5,
        marginTop: 10,
        alignSelf: 'center',
        justifyContent: 'space-between',
        width: "95%",
        flexDirection: 'column',
    },
    buttonIn: {
        backgroundColor: '#ef3b23',
        borderRadius: 25,
        margin: 10,
    },
    buttonOut: {
        borderRadius: 25,
        margin: 10,
    },
    buttonTitleIn: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    buttonTitleOut: {
        color: '#ef3b23',
        fontSize: 14,
        fontWeight: 'bold'
    },
    mnemonicButton: {
        borderColor: '#ef3b23',
        borderRadius: 25,
        padding: 3,
        paddingLeft: 6,
        paddingRight: 6,
    },
    mnemonicButtonContainer: {
        width: '30%',
        marginTop: 5,
        marginBottom: 5,
    },
    mnemonicButtonTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#ef3b23'
    },
});

class GenerateWalletScreen extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            appState: AppState.currentState
        }

        Navigation.mergeOptions(this.props.componentId, {
            topBar: {
                visible: false
            },
            statusBar: {
                visible: false
            },
            layout: {
                backgroundColor: '#202225'
            }
        })

        Navigation.events().bindComponent(this);
    }

    componentDidAppear() {
        const { timestamp } = this.props;
        const walletData = this.props.wallet[timestamp] || {};

        const { seedPhrase, wifKey } = walletData;

        if ((seedPhrase && seedPhrase.length) || (wifKey && wifKey.length)) {
            this.processWallet();
        }
    }

    componentDidMount() {
        this.appStateSubscription = AppState.addEventListener(
            'change',
            this.handleAppStateChange
        );
    }

    componentWillUnmount() {
        this.appStateSubscription?.remove();
    }

    handleAppStateChange = (nextAppState) => {
        if (this.state.appState.match(/background/) && nextAppState === 'active') {
            global.socketConnect.connect();
        }

        this.setState({appState: nextAppState});
    }

    processWallet = async () => {
        const {
            setWalletValues,
            setDefaultValues,
            updateWalletValues,
            genarateType,
            timestamp
        } = this.props;

        const walletData = this.props.wallet[timestamp] || {};
        const { seedPhrase, wifKey } = walletData;

        let firstAddress = {};

        if (wifKey && wifKey.length > 0) {
            firstAddress = generateAddressesFromWIF(wifKey);
        } else {
            firstAddress = generateAddresses(
                seedPhrase.join(" "),
                Config.DERIVATION_PATH + "0"
            );
        }

        const addressKeys = Object.keys(firstAddress);

        if (!addressKeys.length) {
            console.log("WALLET ERROR: No address generated");
            return;
        }

        setWalletValues({
            addresses: { ...firstAddress },
            receiveAddress: addressKeys[0],
            addressBook: [],
            transactions: {},
            timestamp
        });

        // ONLY for imported seed wallets: find every address tied to the seed
        if (genarateType && seedPhrase && seedPhrase.length) {
            try {
                const found = await discoverSeedAddresses(
                    seedPhrase.join(" "),
                    Config.DERIVATION_PATH
                );

                if (Object.keys(found).length) {
                    // keep the default receive address in the list even if unused
                    await updateWalletValues({
                        addresses: { ...firstAddress, ...found },
                        timestamp
                    });
                }
            } catch (e) {
                console.log("Address discovery failed:", e);
                Alert.alert(
                    "Import",
                    "Couldn't finish scanning for this seed's addresses (network problem). " +
                    "The wallet was added, but the balance may be incomplete. " +
                    "Check your connection and import it again."
                );
            }
        }

        setWalletValues({ isCreated: true, timestamp });
        setDefaultValues({ isCreated: true });

        pushWalletList();
    };

    render() {

        return (
            <View style={[styles.flex, {alignContent: 'center', flexDirection: 'column', justifyContent: 'center', backgroundColor: '#202225'}]}>
                 <View style={{flexDirection: 'row', alignItems: 'center'}}>
                     <ActivityIndicator size='small' color='white' style={{margin: 5}} />
                     <Text style={{fontSize: 14, color: 'white'}}>
                         {global.strings['generateWallet.processTitle']}
                     </Text>
                 </View>
                 <Text style={{marginTop: 10, color: 'white'}}>
                     {global.strings['generateWallet.tooltipText']}
                 </Text>
            </View>
        );
    }
}

GenerateWalletScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired,
    password: PropTypes.shape({}).isRequired,
};

export default connectPassword()(connectWallet()(GenerateWalletScreen));
