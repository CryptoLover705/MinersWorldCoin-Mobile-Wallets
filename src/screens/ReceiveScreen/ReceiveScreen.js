// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    Alert,
    Clipboard
} from 'react-native';
import {
    Text,
    Button,
    Divider,
    Overlay,
    Input
} from 'react-native-elements';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Navigation } from 'react-native-navigation';
import Config from 'react-native-config';
import { generateAddresses, getTransactionHistory } from 'src/utils/WalletUtils';
import { connectWallet } from 'src/redux';

const styles = StyleSheet.create({
    flex: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start'
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
    qrContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonsContainer: {
        flexDirection: 'row',
        alignSelf: 'center',
        justifyContent: 'center',
    },
    buttonIn: {
        backgroundColor: 'black',
        borderColor: '#6c82cf',
        borderWidth: 2,
        borderRadius: 20,
        marginTop: 10,
        width: "95%"
    },
    buttonTitleIn: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    buttonOut: {
        color: '#ef3b23',
        borderRadius: 25,
    },
});

class ReceiveScreen extends PureComponent {

    constructor(props) {
        super(props);

        Navigation.events().bindComponent(this);
    }

    newAddress = async () => {
        const { setWalletValues, updateWalletValues, timestamp } = this.props;
        const { addresses, receiveAddress, seedPhrase } = this.props.wallet[timestamp];
        console.log(addresses[receiveAddress].index)
        const newAddress = await generateAddresses(seedPhrase.join(" "), Config.DERIVATION_PATH + "0", addresses[receiveAddress].index+1, addresses[receiveAddress].index+1);
        console.log(newAddress)
        setWalletValues({receiveAddress: Object.keys(newAddress)[0], timestamp: timestamp});

        if (!(Object.keys(newAddress)[0] in addresses)) {
            updateWalletValues({addresses: newAddress, timestamp: timestamp});
        }
    }

    copyAddress = async () => {
        const { timestamp } = this.props;
        const { receiveAddress, seedPhrase } = this.props.wallet[timestamp];

        await Clipboard.setString(receiveAddress);
        Alert.alert(
            global.strings['receive.title'],
            global.strings['receive.copyAlert'],
            [
                {
                    text: global.strings['receive.confirmAlertButton'],
                },
            ],
            {cancelable: false},
        );
    }

    render() {
        const { timestamp } = this.props;

        if (!(timestamp in this.props.wallet)) {
            return <View/>;
        }

        const { receiveAddress } = this.props.wallet[timestamp];

        return (
            <View style={styles.flex}>
                    <View style={styles.basicContainer}>
                        <View style={{flexDirection: 'row', justifyContent: 'center', alignItems:'center'}}>
                                <Text style={{fontSize: 20, fontWeight: 'bold', color: 'black'}}>
                                        {global.strings['receive.infoSubtitle']}
                                </Text>
                        </View>
                        <Divider style={{marginTop: 5, marginBottom: 5, backgroundColor: '#106860'}}/>
                        <View style={styles.qrContainer}>
                            <QRCode
                                value={receiveAddress}
                                size={200}
                            />
                        </View>
                        <Text style={{marginTop: 10, marginBottom: 10, fontSize: 11, fontWeight: 'bold', textAlign: 'center', color: 'gray'}} numberOfLines={1}>
                            {receiveAddress}
                        </Text>
                    </View>
                    <View style={styles.buttonsContainer}>
                             <Button
                                 icon={{ name: "clipboard",
                                                 size: 14,
                                                 type: 'font-awesome',
                                                 color: "white" }}
                                 title={global.strings['receive.copyButton']}
                                 buttonStyle={styles.buttonIn}
                                 containerStyle={{width: "45%", justifyContent: 'center'}}
                                 titleStyle={styles.buttonTitleIn}
                                 onPress={() => this.copyAddress()}
                             />
                             <Button
                                 icon={{ name: "plus",
                                                 size: 14,
                                                 type: 'font-awesome',
                                                 color: "white" }}
                                 buttonStyle={styles.buttonIn}
                                 titleStyle={styles.buttonTitleIn}
                                 containerStyle={{width: "45%", justifyContent: 'center'}}
                                 title={global.strings['receive.newButton']}
                                 onPress={() => this.newAddress()}
                             />
                     </View>
            </View>
        );
    }
}

ReceiveScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(ReceiveScreen);
