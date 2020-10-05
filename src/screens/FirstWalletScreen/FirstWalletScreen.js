// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    Dimensions,
    Image,
    Linking,
    ActivityIndicator,
    Platform,
    TouchableOpacity
} from 'react-native';
import {
    Text,
    Button,
} from 'react-native-elements';
import { CREATE_WALLET_SCREEN, IMPORT_WALLET_SCREEN, pushWalletList } from 'src/navigation';
import { Navigation } from 'react-native-navigation';
import { connectWallet } from 'src/redux';


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
        borderColor: '#000773',
        borderRadius: 16,
    },
    buttonTitleIn: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'white'
    },
    buttonOut: {
        backgroundColor: 'black',
        borderColor: '#6c82cf',
        borderWidth: 2,
        borderRadius: 20,
    },
    buttonTitleOut: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'white'
    }
});


class FirstWalletScreen extends PureComponent {

    constructor(props) {
        super(props);

        Navigation.events().bindComponent(this);
    }

    goToScreen = (screenName) => {

        Navigation.push(this.props.componentId, {
            component: {
                name: screenName,
                options: {
                    topBar: {
                        largeTitle: {
                            visible: false,
                            fontSize: 30,
                            color: 'white',
                            fontFamily: 'HelveticaBold',
                        }
                    }
                }
            }
        });
    }

    CryptoLover = async () => {

        let url = 'https://cryptoloverbots.com';

        Linking.canOpenURL(url).then(supported => {

            if (supported) {
                Linking.openURL(url);
            } else {
                console.log("Don't know how to open URI: " + url);
            }

        });
    }

    navigationButtonPressed = ({ buttonId }) => {
        if (buttonId == 'dismiss') {
            pushWalletList();
        }
    }

    render() {
            return (
                <View style={[styles.flex, {justifyContent: 'center', alignContent: 'center', flexDirection: 'column', backgroundColor: "#202225"}]}>
                    <Image source={require('assets/icons/logo.png')} style={{width: Dimensions.get('window').width*0.5, height: Dimensions.get('window').height*0.25, resizeMode: 'contain'}} />
                    <Text h4 style={{fontWeight: '800', marginTop: 30, color: 'white'}}>
                        {global.strings['firstWallet.firstLineTitle'].toUpperCase()}
                    </Text>
                    <Text style={{fontSize: 20, fontWeight: '600', textAlign: 'center', width: '80%', color: 'white'}}>
                        {global.strings['firstWallet.moto']}
                    </Text>
                    <Text style={{opacity: 0.8, textAlign: 'center', marginTop: 20, width: '70%', color: 'white'}}>
                        {global.strings['firstWallet.tooltipText']}
                    </Text>
                    <Button
                        icon={{ name: "plus",
                                        size: 14,
                                        type: 'font-awesome',
                                        color: "white" }}
                        title={global.strings['firstWallet.createButton']}
                        containerStyle={{width: "70%", marginTop: 30, justifyContent: 'center'}}
                        buttonStyle={styles.buttonOut}
                        titleStyle={styles.buttonTitleOut}
                        onPress={() => this.goToScreen(CREATE_WALLET_SCREEN)}
                    />
                    <Button
                        icon={{ name: "download",
                                        size: 14,
                                        type: 'font-awesome',
                                        color: "white" }}
                        title={global.strings['firstWallet.importButton']}
                        containerStyle={{width: "70%", marginTop: 10, justifyContent: 'center'}}
                        type="clear"
                        titleStyle={styles.buttonTitleIn}
                        onPress={() => this.goToScreen(IMPORT_WALLET_SCREEN)}
                    />
                    <Text style={{opacity: 0.8, textAlign: 'center', marginTop: 20, width: '70%', color: 'white'}}>
                        Developed by
                    </Text>
                    <TouchableOpacity onPress={this.CryptoLover}>
                        <Text style={{opacity: 0.8, textAlign: 'center', fontWeight: 'bold', color: 'white'}}>
                            CryptoLover
                        </Text>
                    </TouchableOpacity>
                </View>
            );
    }
}

export default FirstWalletScreen;
