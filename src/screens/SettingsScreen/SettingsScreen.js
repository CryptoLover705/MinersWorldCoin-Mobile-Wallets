// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    Alert,
    ScrollView,
    Clipboard,
    Platform
} from 'react-native';
import {
    Text,
    Button,
    ListItem,
    Divider
} from 'react-native-elements';
import { Navigation } from 'react-native-navigation';
import * as Keychain from 'react-native-keychain';
import { connectWallet } from 'src/redux';
import { getTransactionHistory, getBalance } from 'src/utils/WalletUtils';
import { pushWalletList, pushPasswordGate, pushStarterStack, LANGUAGE_LIST_SCREEN, IMPORT_KEY_SCREEN } from 'src/navigation';

const styles = StyleSheet.create({
    flex: {
        flex: 1
    },
    buttonsContainer: {
        flexDirection: 'row',
        alignContent: 'space-between',
    },
    basicContainer: {
        padding: 10,
        paddingTop: 15,
        paddingBottom: 5,
        backgroundColor: 'white',
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

class SettingsScreen extends PureComponent {

    constructor(props) {
        super(props);

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
                    text: global.strings['settings.title']
                },
                visible: true,
            }
        })

        Navigation.events().bindComponent(this);
    }

    navigationButtonPressed = ({ buttonId }) => {
     if (buttonId == 'dismiss') {
            Navigation.dismissModal(this.props.componentId);
     }
    }

    clearTransactionsCache = () => {
        const { setWalletValues, timestamp } = this.props;
        const { addresses, transactions } = this.props.wallet[timestamp];

        getTransactionHistory(global.socketConnect, addresses).then((newTransactions) => {
            setWalletValues({transactions: newTransactions, timestamp: timestamp});

            getBalance(newTransactions).then((balance) => {
                setWalletValues({balance, timestamp});
            })
        });

        Alert.alert(
            global.strings['settings.title'],
            global.strings['settings.clearTxAlert'],
            [
                {
                    text: global.strings['settings.confirmAlertButton'],
                },
            ],
            {cancelable: false},
        );
    }

    clearAddressBook = async () => {
        const { setWalletValues, timestamp } = this.props;

        setWalletValues({addressBook: [], timestamp: timestamp});

        Alert.alert(
            global.strings['settings.title'],
            global.strings['settings.clearAddressBookAlert'],
            [
                {
                    text: global.strings['settings.confirmAlertButton'],
                },
            ],
            {cancelable: false},
        );
    }

    copySeedPhrase = async () => {
        const { timestamp } = this.props;
        const { seedPhrase } = this.props.wallet[timestamp];

        await Clipboard.setString(seedPhrase.join(" "));
        Alert.alert(
            global.strings['settings.title'],
            global.strings['settings.copySeedAlert'],
            [
                {
                    text: global.strings['settings.confirmAlertButton'],
                },
            ],
            {cancelable: false},
        );
    }

    changePassword = async () => {
        const { timestamp } = this.props;

        pushPasswordGate(0, timestamp);
    }

    walletList = () => {
            pushWalletList();
    }

    ObjectLength = (object) => {
        var length = 0;
        for( var key in object ) {
                if( object.hasOwnProperty(key) ) {
                        ++length;
                }
        }
        return length;
        }

    removeWallet = () => {
        const { setInitialWalletState, setDefaultValues, componentId, wallet, timestamp } = this.props;
        var isCreated = false;

        Alert.alert(
            global.strings['settings.title'],
            global.strings['settings.removeWalletAlert'],
            [
                {
                    text: global.strings['settings.doNotRemoveWalletButton'],

                },
                {
                    text: global.strings['settings.removeWalletButton'],
                    onPress: () => {
                        for (var walletTimestamp in wallet) {
                            if (typeof wallet[walletTimestamp] === "object") {
                                if (("isCreated" in wallet[walletTimestamp]) && (wallet[walletTimestamp].isCreated == true) && (walletTimestamp != timestamp)) {
                                    isCreated = true;
                                    break;
                                }
                            }
                        }

                        setDefaultValues({isCreated});
                        pushWalletList();
                        setInitialWalletState({timestamp});

                        global.strings.setLanguage(global.strings.getInterfaceLanguage());
                    },
                },
            ],
            {cancelable: false},
        );
    }

    changeLanguage = async () => {
        const { componentId } = this.props;

        Navigation.showModal({
            stack: {
                children: [{
                    component: {
                        name: LANGUAGE_LIST_SCREEN,
                        passProps: {
                            settingsComponentId: componentId
                        },
                    }
                }]
            }
        });
    }

    openWIFImport = () => {
        Navigation.showModal({
            stack: {
                children: [{
                    component: {
                        name: IMPORT_KEY_SCREEN,
                        passProps: {

                        },
                    }
                }]
            }
        });
    }

    render() {
        const firstSection = [
            {
                title: global.strings['settings.clearTxCache'],
                icon: 'inbox',
                topDivider: true,
                subtitle: global.strings['settings.clearTxCacheTooltipText'],
                onPress: () => this.clearTransactionsCache()
            },
            {
                title: global.strings['settings.clearAddressBook'],
                icon: 'book',
                subtitle: global.strings['settings.clearAddressBookTooltipText'],
                onPress: () => this.clearAddressBook()
            },
            {
                title: global.strings['settings.copyRecoveryPhrase'],
                icon: 'file-text',
                subtitle: global.strings['settings.copyRecoveryPhraseTooltipText'],
                onPress: () => this.copySeedPhrase()
            },
            {
                title: global.strings['settings.walletList'],
                icon: 'list',
                subtitle: null,
                onPress: () => pushWalletList()
            },
        ]

        const secondSection = [
            /*{
                title: global.strings['settings.importWIF'],
                icon: 'key',
                subtitle: null,

                onPress: () => this.openWIFImport()
            },*/
            {
                title: global.strings['settings.changePassword'],
                icon: 'unlock',
                subtitle: null,
                topDivider: true,
                onPress: () => this.changePassword()
            },
            {
                title: global.strings['settings.changeLanguage'],
                icon: 'language',
                subtitle: null,
                onPress: () => this.changeLanguage()
            },
        ]

        const thirdSection = [
            {
                title: global.strings['settings.removeWallet'],
                icon: 'eraser',
                subtitle: global.strings['settings.removeWalletTooltipText'],
                topDivider: true,
                onPress: () => this.removeWallet()
            },
        ]

        return (
            <View style={styles.flex}>
                <ScrollView>
                {
                    firstSection.map((item, i) => (
                        <ListItem
                            onPress={item.onPress}
                            key={i}
                            title={item.title}
                            subtitle={item.subtitle}
                            bottomDivider={true}
                            topDivider={item.topDivider}
                            titleStyle={{color: 'black'}}
                            subtitleStyle={{fontSize: 12, color: 'gray'}}
                            leftIcon={{ name: item.icon, type: 'font-awesome', color: 'gray', size: 20 }}
                        />
                    ))
                }
                <View style={{marginTop: 20}} />
                {
                    secondSection.map((item, i) => (
                        <ListItem
                            onPress={item.onPress}
                            key={i}
                            title={item.title}
                            subtitle={item.subtitle}
                            bottomDivider={true}
                            topDivider={item.topDivider}
                            titleStyle={{color: 'black'}}
                            subtitleStyle={{fontSize: 12, color: 'gray'}}
                            rightIcon={{ name: 'chevron-right', type: 'font-owesome', size: 20 }}
                            leftIcon={{ name: item.icon, type: 'font-awesome', color: 'gray', size: 20 }}
                        />
                    ))
                }
                <View style={{marginTop: 20}} />
                {
                    thirdSection.map((item, i) => (
                        <ListItem
                            onPress={item.onPress}
                            key={i}
                            title={item.title}
                            subtitle={item.subtitle}
                            bottomDivider={true}
                            topDivider={item.topDivider}
                            titleStyle={{color: 'black'}}
                            subtitleStyle={{fontSize: 12, color: 'gray'}}
                            leftIcon={{ name: item.icon, type: 'font-awesome', color: 'gray', size: 20 }}
                        />
                    ))
                }

                <View style={{flexDirection: 'row', justifyContent: "center", alignItems: "center", marginTop: 14, backgroundColor: '#202225'}}>
                    <Text style={{fontSize: 14, padding: 10, color: 'white'}}>
                        Version: 1.0.1, Build: 8
                    </Text>
                </View>

                </ScrollView>
            </View>
        );
    }
}

SettingsScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired,
};

export default (connectWallet()(SettingsScreen));
