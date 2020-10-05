// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    ScrollView,
    Image,
    TouchableOpacity
} from 'react-native';
import {
    Text,
    Button,
    Overlay,
    Input
} from 'react-native-elements';
import Icon from 'react-native-vector-icons/FontAwesome';
import Identicon from 'identicon.js';
import { WALLET_SCREEN, pushStarterStack, pushPasswordGate } from 'src/navigation';
import { getMirgationWallets, removeMirgationWallets, createWalletFromMigrate, decryptData, decryptWallet, numberWithCommas } from 'src/utils/WalletUtils';
import { Navigation } from 'react-native-navigation';
import { connectWallet } from 'src/redux';
import Config from 'react-native-config';


const styles = StyleSheet.create({
    flex: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start'
    },
    basicContainer: {
        padding: 10,
        backgroundColor: 'white',
        alignSelf: 'center',
        justifyContent: 'flex-start',
        flexDirection: 'row',
        width: '100%',
        borderBottomColor: '#f0eff5',
        borderBottomWidth: 1
    },
    qrContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10
    },
    buttonsContainer: {
        flexDirection: 'row',
        alignSelf: 'center',
        justifyContent: 'center',
    },
    buttonIn: {
        backgroundColor: '#000773',
        borderRadius: 5,
        margin: 10,
    },
    buttonTitleIn: {
        fontSize: 14,
        fontWeight: 'bold'
    },
});

class WalletListScreen extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            actionsOverlay: false,
            actionAddress: {index: 0, address: "", name: ""}
        }

        Navigation.events().bindComponent(this);
    }

    componentDidMount() {
        const { defaultLanguage } = this.props.wallet;

        if (defaultLanguage) {
            global.strings.setLanguage(defaultLanguage);
        }

        this.firstCheck();

        Navigation.mergeOptions(this.props.componentId, {
            topBar: {
                largeTitle: {
                    visible: false,
                    noBorder: true,
                    fontSize: 30,
                    fontFamily: 'HelveticaBold',
                    color: 'white',
                },
                title: {
                    text: global.strings['walletList.title']
                },
                rightButtons: [
                    {
                        color: 'white',
                        id: 'addWallet',
                        icon: require('../../assets/icons/ic_plus.png'),
                    }
                ],
                leftButtons: [],
                backButton: {

                },
                visible: true,
            }
        })
    }

    navigationButtonPressed({ buttonId }) {
        if (buttonId == "addWallet") {
            pushStarterStack(1)
        }
    }

    firstCheck = async () => {
        const { addNewWallet, setWalletValues, setDefaultValues } = this.props;
        const { isCreated } = this.props.wallet;
        let wallets = await getMirgationWallets();

        if (wallets) {
            for (var i = 0; i < wallets.length; i++) {
                let timestamp = parseInt(new Date() / 1000) + i;

                addNewWallet({timestamp: timestamp});
                setWalletValues({isMigrated: false, isCreated: true, migrationData: wallets[i], title: wallets[i].title, timestamp: timestamp});
            }

            setDefaultValues({isCreated: true});
            await removeMirgationWallets();
        } else {
            if (!isCreated) {
                pushStarterStack();
            }
        }
    }

    openWalletScreen = (timestamp) => {
        const { setWalletValues } = this.props;
        const { isMigrated, migrationData } = this.props.wallet[timestamp];

        if (isMigrated) {
            pushPasswordGate(1, timestamp)
        } else {
            pushPasswordGate(2, timestamp, (password) => {
                var decryptedPassword = decryptData(migrationData.password, password);

                if (decryptedPassword == password) {
                    let wallet = decryptWallet(migrationData, password);
                    wallet.timestamp = timestamp;
                    setWalletValues(wallet);
                    return true;
                }

                return false;
            })
        }
    }

    render() {
        const wallets = this.props.wallet;
        const { actionAddress, actionsOverlay } = this.state;

        return (
            <View style={[styles.flex, {alignSelf: 'center', width: '100%'}]}>
                <ScrollView style={{width: '100%'}}>
                    {
                            Object.keys(wallets).sort().map((timestamp, index) => (
                                wallets[timestamp].isCreated && <TouchableOpacity onPress={() => this.openWalletScreen(timestamp)} key={index}>
                                <WalletItem params={wallets[timestamp]} />
                            </TouchableOpacity>
                            ))
                    }
                </ScrollView>
            </View>
        );
    }
}

class WalletItem extends PureComponent {

    render = () => {
        const { params } = this.props;
        var options = {
            foreground: [255, 191, 0, 255],
        };

        return (
            <View style={styles.basicContainer}>
                <Image style={{width: 50, height: 50, marginRight: 10, borderRadius: 5}} source={require('assets/icons/logo.png')}/>
                <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start'}}>
                    <Text style={{fontSize: 16, color: "black"}} numberOfLines={2}>
                     <Text style={{fontWeight: 'bold'}}>{params.title}</Text>
                    </Text>
                    <Text style={{fontSize: 12, marginTop: 5}}>
                        {params.isMigrated ? (numberWithCommas((params.balance.confirmed/Math.pow(10, 8)).toFixed(4)) + " " + Config.COIN_NAME) : global.strings['walletList.notMigrated']}
                    </Text>
                </View>
            </View>
        );
    }
}

WalletListScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(WalletListScreen);
