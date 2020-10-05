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
import { connectWallet, connectPassword } from 'src/redux';
import { getTransactionHistory } from 'src/utils/WalletUtils';
import { pushPasswordGate, initialNav } from 'src/navigation';

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

class AddressListScreen extends PureComponent {

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
                    text: global.strings['addressList.title']
                },
                rightButtons: [
                    {
                        color: 'white',
                        id: 'dismiss',
                        text: global.strings['addressList.cancelButton']
                    }
                ],
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

    chooseAddress = (address) => {
        const { setWalletValues, timestamp } = this.props;

        setWalletValues({cache: {sendAddress: address}, timestamp: timestamp});
        Navigation.dismissModal(this.props.componentId);
    }

    render() {
        const { timestamp } = this.props;
        const { addressBook } = this.props.wallet[timestamp];
        var list = [];

        for (let i = 0; i < addressBook.length; i++) {
            list.push({title: addressBook[i].address, subtitle: addressBook[i].name, onPress: () => this.chooseAddress(addressBook[i].address)});
        }

        return (
            <View style={styles.flex}>
                <ScrollView>
                {
                    list.map((item, i) => (
                        <ListItem
                            onPress={item.onPress}
                            key={i}
                            title={item.title}
                            subtitle={item.subtitle}
                            bottomDivider={true}
                            titleStyle={{fontSize: 14, color: 'black'}}
                            subtitleStyle={{fontSize: 12, color: 'gray'}}
                        />
                    ))
                }
                </ScrollView>
            </View>
        );
    }
}

AddressListScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(AddressListScreen);
