// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    Image,
    ActivityIndicator,
    AppState
} from 'react-native';
import {
    Text
} from 'react-native-elements';
import { pushWalletList } from 'src/navigation';
import { Navigation } from 'react-native-navigation';
import Config from 'react-native-config';
import { findAddresses, generateAddresses, getBalance, getTransactionHistory } from 'src/utils/WalletUtils';
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
        const { seedPhrase } = this.props.wallet[timestamp];

        if (seedPhrase.length) {
            this.processWallet();
        }
    }

    componentDidMount() {
        AppState.addEventListener('change', this.handleAppStateChange);
    }

    componentWillUnmount() {
        AppState.removeEventListener('change', this.handleAppStateChange);
    }

    handleAppStateChange = (nextAppState) => {
        if (this.state.appState.match(/background/) && nextAppState === 'active') {
            global.socketConnect.connect();
        }

        this.setState({appState: nextAppState});
    }

    processWallet = async() => {
            const { setWalletValues, setDefaultValues, updateWalletValues, setPasswordValues, genarateType, timestamp } = this.props;
            const { seedPhrase, password } = this.props.wallet[timestamp];

            const firstAddress = generateAddresses(seedPhrase.join(" "), Config.DERIVATION_PATH + "0");
            setWalletValues({addresses: {...firstAddress}, receiveAddress: Object.keys(firstAddress)[0], addressBook: [], transactions: {}, timestamp: timestamp});

            if (genarateType) {
                const externalAddresses = await findAddresses(global.socketConnect, seedPhrase.join(" "), Config.DERIVATION_PATH + "0");
                const internalAddresses = await findAddresses(global.socketConnect, seedPhrase.join(" "), Config.DERIVATION_PATH + "1");

                if (Object.keys(externalAddresses).length || Object.keys(internalAddresses).length) {
                    await updateWalletValues({addresses: {...externalAddresses, ...internalAddresses}, timestamp: timestamp});
                }

            }

            setWalletValues({isCreated: true, timestamp: timestamp});
            setDefaultValues({isCreated: true});
            // pushWalletStack();

            pushWalletList();
    }

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
