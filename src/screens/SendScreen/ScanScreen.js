import React, { PureComponent } from 'react';
import {
    View,
    StyleSheet,
    Alert
} from 'react-native';
import {
    Button
} from 'react-native-elements';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { connectWallet } from 'src/redux';
import { isAddress } from 'src/utils/WalletUtils';
import { Navigation } from 'react-native-navigation';
import Config from 'react-native-config';

const styles = StyleSheet.create({
    centerText: {
        flex: 1,
        fontSize: 18,
        padding: 32,
        color: '#777',
    },
    textBold: {
        fontWeight: '500',
        color: '#000',
    },
    buttonText: {
        fontSize: 21,
        color: 'rgb(0,122,255)',
    },
    buttonTouchable: {
        padding: 16,
    },
    buttonIn: {
        backgroundColor: 'black',
        borderColor: '#6c82cf',
        borderWidth: 2,
        borderRadius: 20,
        marginTop: 14,
    },
    buttonTitleIn: {
        fontSize: 14,
        fontWeight: 'bold'
    },
});

class ScanScreen extends PureComponent {
    constructor(props) {
        super(props);


        Navigation.mergeOptions(this.props.componentId, {
            layout: {
                backgroundColor: '#fff'
            },
            statusBar: {
                visible: false,
            },
            topBar: {
                visible: false,
            }
        })

        Navigation.events().bindComponent(this);
    }

    onSuccess = (e) => {
        const { setWalletValues, timestamp } = this.props;
        var address = e.data;

        address.startsWith(`${Config.NETWORK_NAME.toLowerCase()}:`) && address.replace(`${Config.NETWORK_NAME.toLowerCase()}:`, '');

        if(isAddress(address)) {
            setWalletValues({cache: {sendAddress: address}, timestamp: timestamp});
            this.dismissModal();
        }
     }

    dismissModal = () => {
        Navigation.dismissModal(this.props.componentId);
    }



    render() {
        return (
            <View style={{height: "100%", width: "100%", flex: 1}}>
                <QRCodeScanner
                    onRead={this.onSuccess}
                    cameraStyle={{height: "100%"}}
                />
                <View style={{position: "absolute", bottom: 20, left: 0, right: 0, justifyContent: 'center', alignItems: 'center'}}>
                    <Button
                        icon={{ name: "times",
                                        size: 14,
                                        type: 'font-awesome',
                                        color: "white" }}

                        title={global.strings['send.dismissScanModalButton']}
                        containerStyle={{width: "90%", justifyContent: 'center'}}
                        buttonStyle={styles.buttonIn}
                        titleStyle={styles.buttonTitleIn}
                        onPress={() => this.dismissModal()}
                    />
                </View>
            </View>
        );
    }
}

export default connectWallet()(ScanScreen);
