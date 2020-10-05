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
import QRCode from 'react-native-qrcode-svg';
import { Navigation } from 'react-native-navigation';
import { responsiveHeight, responsiveWidth, responsiveFontSize } from 'react-native-responsive-dimensions';
import { connectWallet } from 'src/redux';
import { isAddress } from 'src/utils/WalletUtils';
import { pushPasswordGate } from 'src/navigation';

const styles = StyleSheet.create({
    flex: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start'
    },
    basicContainer: {
        padding: 10,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: '#202225',
        borderRadius: 5,
        alignSelf: 'center',
        justifyContent: 'flex-start',
        flexDirection: 'column',
    },
    buttonsContainer: {
        flexDirection: 'row',
        alignContent: 'space-between',
    },
    buttonIn: {
        backgroundColor: '#106860',
        borderColor: '#299a8f',
        borderWidth: 2,
        borderRadius: 6,
    },
    buttonTitleIn: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    buttonOut: {
        backgroundColor: '#106860',
        borderColor: '#299a8f',
        borderWidth: 2,
        borderRadius: 6,
        marginTop: 10
    },
    buttonTitleOut: {
        fontSize: 14,
        color: 'white'
    }
});

class AddressInfoScreen extends PureComponent {

        constructor(props) {
            super(props);

            this.state = {
                addressItem:  this.props.addressItem,
                timestamp: this.props.timestamp
            }

            Navigation.mergeOptions(this.props.componentId, {
                layout: {
                    backgroundColor: '#202225'
                },
                statusBar: {
                    visible: true,
                    style: 'light'
                },
                topBar: {
                    elevation: 0,
                    noBorder: true,
                    background: {
                        color: '#202225',
                    },
                }
            })

            Navigation.events().bindComponent(this);
        }

        cancel = async () => {
            Navigation.dismissModal(this.props.componentId);
        }

        removeAddress = () => {
            const { setWalletValues } = this.props;
            const { addressItem, timestamp } = this.state;
            var { addressBook } = this.props.wallet[timestamp];

            for( var i = 0; i < addressBook.length; i++){
                if ( addressBook[i].address === addressItem.address) {
                    addressBook.splice(i, 1);
                }
            }

            setWalletValues({addressBook, timestamp: timestamp});
            this.cancel();
        }

        openSendScreen = () => {
            const { setWalletValues, timestamp } = this.props;
            const { addressItem } = this.state;

            setWalletValues({cache: {sendAddress: addressItem.address}, timestamp: timestamp});
            this.cancel();

            Navigation.mergeOptions(this.props.previousComponentId, {
                bottomTabs: {
                    currentTabIndex: 3,
                },
            });
        }

        render() {
            const { addressItem } = this.state;

            return (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View enabled behavior="padding" style={[styles.flex, {justifyContent: 'flex-start', alignContent: 'center', flexDirection: 'column', backgroundColor: '#202225'}]}>
                        <Image
                            style={{width: responsiveWidth(20), height: responsiveHeight(12), resizeMode: 'contain'}}
                            source={require('assets/icons/logo-white.png')}
                        />
                        <Text style={{fontSize: 20, marginTop: 10, fontWeight: 'bold', color: 'white'}}>
                            {global.strings["addressInfo.title"]}
                        </Text>
                        <Text style={{fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginTop: 5, marginBottom: 10, width: '85%', color: "gray"}}>
                            {global.strings["addressInfo.subtitle"]}
                        </Text>
                        <QRCode
                            value={addressItem.address}
                            size={200}
                            backgroundColor='#202225'
                            color='white'
                        />
                        <Text style={{marginTop: 10, marginBottom: 10, fontSize: 12, fontWeight: 'bold', textAlign: 'center', color: 'gray'}} numberOfLines={1}>
                            {addressItem.address}
                        </Text>
                        <View style={styles.buttonsContainer}>
                            <Button
                                icon={{ name: "paper-plane",
                                                size: 14,
                                                type: 'font-awesome',
                                                color: "white" }}
                                title={global.strings['addressBook.sendButton']}
                                buttonStyle={styles.buttonIn}
                                containerStyle={{width: "90%", justifyContent: 'space-around'}}
                                titleStyle={styles.buttonTitleIn}
                                onPress={this.openSendScreen}
                            />
                            </View>
                            <View style={styles.buttonsContainer}>
                            <Button
                                icon={{ name: "trash",
                                                size: 14,
                                                type: 'font-awesome',
                                                color: "white" }}
                                buttonStyle={styles.buttonOut}
                                titleStyle={styles.buttonTitleOut}
                                type='outline'
                                containerStyle={{width: "90%", justifyContent: 'space-around'}}
                                title={global.strings['addressBook.removeButton']}
                                onPress={this.removeAddress}
                            />
                            </View>
                        <View style={{position: "absolute", bottom: 10, left: 0, right: 0, justifyContent: 'center', alignItems: 'center'}}>
                            <Button
                                icon={{ name: "times",
                                                size: 14,
                                                type: 'font-awesome',
                                                color: "white" }}

                                title={global.strings["addAddress.cancelButton"]}
                                type='clear'
                                containerStyle={{width: "90%", marginTop: 10, marginBottom: 10, justifyContent: 'center'}}
                                titleStyle={styles.buttonTitleOut}
                                onPress={() => this.cancel()}
                            />
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            );
        }
     }

AddressInfoScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(AddressInfoScreen);
