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
        backgroundColor: 'black',
        borderColor: '#6c82cf',
        borderWidth: 2,
        borderRadius: 20,
        margin: 10,
    },
    buttonTitleIn: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    buttonOut: {
        paddingTop: 5,
        paddingBottom: 5,
        color: '#000773',
        borderRadius: 5,
    },
    buttonTitleOut: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'white'
    },
});

class AddAddressScreen extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            name: this.props.name ? this.props.name : "",
            address: this.props.address ? this.props.address : "",
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

        add = async () => {
                const { setWalletValues, timestamp } = this.props;
                var { addressBook } = this.props.wallet[timestamp];
                const { name, address } = this.state;

                if (name.length > 2 && isAddress(address)) {

                        for (var i = 0; i < addressBook.length; i++) {
                                if (addressBook[i].name == name) {
                                        Alert.alert(
                                                global.strings["addAddress.title"],
                                                global.strings["addAddress.existNameAlert"],
                                                [
                                                        {
                                                                text: global.strings["addAddress.confirmAlertButton"],
                                                         },
                                                 ],
                                                 {cancelable: false},
                                         );

                                         return;
                                 }

                                 if (addressBook[i].address == address) {
                                         Alert.alert(
                                                 global.strings["addAddress.title"],
                                                 global.strings["addAddress.existAddressAlert"],
                                                 [
                                                         {
                                                                 text: global.strings["addAddress.confirmAlertButton"],
                                                         },
                                                 ],
                                                 {cancelable: false},
                                         );

                                                return;
                                 }
                     }

                     addressBook.push({name: name, address: address});
                     setWalletValues({addressBook: addressBook, timestamp: timestamp});

                     Alert.alert(
                global.strings["addAddress.title"],
                global.strings["addAddress.successAlert"],
                [
                    {
                        text: global.strings["addAddress.confirmAlertButton"],
                        onPress: () => this.cancel(),
                    },
                ],
                {cancelable: false},
            );
        } else {
            if (name.length <= 2) {
                Alert.alert(
                    global.strings["addAddress.title"],
                    global.strings["addAddress.incorrectNameAlert"],
                    [
                        {
                            text: global.strings["addAddress.confirmAlertButton"],
                        },
                    ],
                    {cancelable: false},
                );
            } else if (!isAddress(address)) {
                Alert.alert(
                    global.strings["addAddress.title"],
                    global.strings["addAddress.incorrectAddressAlert"],
                    [
                        {
                            text: global.strings["addAddress.confirmAlertButton"],
                        },
                    ],
                    {cancelable: false},
                );
            }

                }
        }

     cancel = async () => {
         Navigation.dismissModal(this.props.componentId);
     }

    render() {

        return (
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View enabled behavior="padding" style={[styles.flex, {justifyContent: 'flex-start', alignContent: 'center', flexDirection: 'column', backgroundColor: '#202225'}]}>
                    <Image
                        style={{width: responsiveWidth(24), height: responsiveHeight(12), resizeMode: 'contain'}}
                        source={require('assets/icons/logo.png')}
                    />
                    <Text style={{fontSize: 20, marginTop: 10, fontWeight: 'bold', color: 'white'}}>
                        {global.strings["addAddress.title"]}
                    </Text>
                    <Text style={{fontSize: 14, color: "white", opacity: 0.9, textAlign: 'center', marginTop: 10, width: '85%'}}>
                        {global.strings["addAddress.subtitle"]}
                    </Text>

                    <Divider style={{marginTop: 10, marginBottom: 10, width: '100%',  backgroundColor: 'white'}}/>

                    <Input
                        placeholder={global.strings["addAddress.nameInput"]}
                        inputStyle={{fontSize: 14, textAlign: 'left', color: 'white'}}
                        containerStyle={{paddingHorizontal: 0, width: '90%'}}
                        placeholderTextColor='white'
                        onChangeText={(name) => this.setState({name})}
                        renderErrorMessage={false}
                        defaultValue={this.state.name}
                    />
                    <Text style={{fontSize: 14, color: "white", textAlign: 'left', marginTop: 5, width: '90%'}}>
                        {global.strings["addAddress.nameTooltipText"]}
                    </Text>

                    <Input
                        placeholder={global.strings["addAddress.addressInput"]}
                        inputStyle={{fontSize: 14, textAlign: 'left', color: 'white'}}
                        containerStyle={{paddingHorizontal: 0, width: '90%', marginTop: 10}}
                        placeholderTextColor='white'
                        onChangeText={(address) => this.setState({address})}
                        renderErrorMessage={false}
                        defaultValue={this.state.address}
                    />
                    <Text style={{fontSize: 14, color: "white", textAlign: 'left', marginTop: 5, width: '90%'}}>
                        {global.strings["addAddress.addressTooltipText"]}
                    </Text>

                    <View style={{position: "absolute", bottom: 10, left: 0, right: 0, justifyContent: 'center', alignItems: 'center'}}>
                        <Button
                            icon={{ name: "check-circle",
                                            size: 14,
                                            type: 'font-awesome',
                                            color: "white" }}

                            title={global.strings["addAddress.addButton"]}
                            containerStyle={{width: "90%", justifyContent: 'center'}}
                            buttonStyle={styles.buttonIn}
                            titleStyle={styles.buttonTitleIn}
                            onPress={() => this.add()}
                        />
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

AddAddressScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(AddAddressScreen);
