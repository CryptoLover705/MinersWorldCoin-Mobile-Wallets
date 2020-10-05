// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    Alert,
    Image,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import {
    Text,
    Button,
    Input
} from 'react-native-elements';
import { responsiveHeight, responsiveWidth, responsiveFontSize } from 'react-native-responsive-dimensions';
import { Navigation } from 'react-native-navigation';
import TouchID from 'react-native-touch-id';
import { pushWalletStack, pushWalletList } from 'src/navigation';
import { connectPassword } from 'src/redux';
import Config from 'react-native-config';

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
        backgroundColor: 'white',
        borderRadius: 5,
        marginTop: 10,
        alignSelf: 'center',
        justifyContent: 'space-between',
        width: "95%",
        flexDirection: 'column',
    },
    buttonIn: {
        backgroundColor: 'black',
        borderColor: '#6c82cf',
        borderWidth: 2,
        borderRadius: 20,
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
        color: '#000773',
        fontSize: 14,
        fontWeight: 'bold'
    },
    digitButton: {
        height: responsiveWidth(20),
        width: responsiveWidth(20),
        borderRadius: 50,
        borderColor: '#505659'
    },
    digitButtonTitle: {
        fontSize: responsiveFontSize(4),
        color: '#505659',
    },
    digitButtonContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        flexGrow: 1,
    },
    buttonGroupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingBottom: 10,
        paddingTop: 10,
        paddingLeft: 25,
        paddingRight: 25
    }
});

class PasswordScreen extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            password: '',
            step: 0,
            newPassword: ''
        }

        Navigation.mergeOptions(this.props.componentId, {
            layout: {
                backgroundColor: '#202225'
            },
            statusBar: {
                style: 'light'
            },
            topBar: {
                elevation: 0,
                noBorder: true,
                title: {
                    text: global.strings['password.title'],
                },
                background: {
                    color: '#202225',
                },
                rightButtons: {
                    id: 'dismiss',
                    text: global.strings['password.cancelButton'],
                    color: 'white'
                },
            }
        })

        Navigation.events().bindComponent(this);
    }

    componentDidMount() {
        const { type, timestamp, password } = this.props;

        try {
            if (type == 1) {
                if(password[timestamp].useBiometric) {
                    TouchID.isSupported()
                        .then(biometryType => {
                            this.biometricAuth(type, timestamp);
                        })
                }
            }
        } catch (e) {
                console.log(e)
        }
    }

    navigationButtonPressed = ({ buttonId }) => {
        const { type } = this.props;

        if (buttonId == 'dismiss') {
            if (type == 1) {
                    pushWalletList();
            } else {
                    Navigation.dismissModal(this.props.componentId);
            }
        }
    }

    processResult = () => {
        const { type, timestamp } = this.props;
        var { password, newPassword, step } = this.state;

        if(password.length >= 4) {
            if (type == 1) {
                this.checkPassword(password, type);
            } else if (type == 2) {
                this.processCallback(password);
            } else {
                if (!step) {
                    this.setState({newPassword: password, password: '', step: 1})
                } else {
                    if (password != newPassword) {
                        Alert.alert(
                            global.strings['password.title'],
                            global.strings['password.doNotMatchAlert'],
                            [
                                {
                                    text: global.strings['password.confirmAlertButton'],
                                    onPress: () => this.setState({newPassword: '', password: '', step: 0}),
                                },
                            ],
                            {cancelable: false},
                        );
                    } else {
                        Alert.alert(
                            global.strings['password.title'],
                            global.strings['password.useBioAlert'],
                            [
                                {
                                    text: global.strings['password.doNotUseBioButton'],
                                    onPress: () => this.savePasswordAndDismiss(password, false),
                                },
                                {
                                    text: global.strings['password.useBioButton'],
                                    onPress: () => this.savePasswordAndDismiss(password, true)
                                },
                            ],
                            {cancelable: false},
                            );
                    }
                }
            }
        } else {
            Alert.alert(
                global.strings['password.title'],
                global.strings['password.incorrectPasswordLenght'],
                [
                        {
                            text: global.strings['password.confirmAlertButton'],
                            onPress: () => this.setState({newPassword: '', password: '', step: 0}),
                        },
                ],
                {cancelable: false},
                );
        }
    }

    processCallback = (password) => {
        const { callback } = this.props;

        if (callback(password)) {
            Alert.alert(
                global.strings['password.title'],
                global.strings['password.useBioAlert'],
                [
                    {
                        text: global.strings['password.doNotUseBioButton'],
                        onPress: () => this.savePasswordAndDismiss(password, false),
                    },
                    {
                        text: global.strings['password.useBioButton'],
                        onPress: () => this.savePasswordAndDismiss(password, true)
                    },
                ],
                {cancelable: false},
            );
        } else {
            Alert.alert(
                global.strings['password.title'],
                global.strings['password.incorrectPINAlert'],
                [
                    {
                        text: global.strings['password.confirmAlertButton'],
                        onPress: () => this.setState({password: ''}),
                    },
                ],
                {cancelable: false},
            );
        }
    }

    biometricAuth = (type, timestamp) => {
        const optionalConfigObject = {
            title: global.strings['password.android.biomentricTitle'], // Android
            imageColor: '#e00606', // Android
            imageErrorColor: '#ff0000', // Android
            sensorDescription: global.strings['password.android.biomentricTooltipText'], // Android
            sensorErrorDescription: global.strings['password.android.biomentricError'], // Android
            cancelText: global.strings['password.cancelButton'], // Android
            fallbackLabel: global.strings['password.enterPINTitle'], // iOS (if empty, then label is hidden)
            unifiedErrors: false, // use unified error messages (default false)
            passcodeFallback: false, // iOS - allows the device to fall back to using the passcode, if faceid/touch is not available. this does not mean that if touchid/faceid fails the first few times it will revert to passcode, rather that if the former are not enrolled, then it will use the passcode.
        };

        TouchID.authenticate(global.strings['password.biomentricTooltipText'], optionalConfigObject)
        .then(success => {
            if (type == 1) {
                pushWalletStack(timestamp);
            }
        })
    }

    checkPassword = async (currentPassword, type) => {
        const { timestamp, password } = this.props;

        if (currentPassword == password[timestamp].value) {
            if (type == 1) {
                pushWalletStack(timestamp);
            }
        } else {
            Alert.alert(
                global.strings['password.title'],
                global.strings['password.incorrectPINAlert'],
                [
                    {
                        text: global.strings['password.confirmAlertButton'],
                        onPress: () => this.setState({password: ''}),
                    },
                ],
                {cancelable: false},
            );
        }

    }

    savePasswordAndDismiss = async (currentPassword, useBiometric = false) => {
        const { timestamp, password, setPasswordValues, addNewPassword } = this.props;

        addNewPassword({timestamp});
        setPasswordValues({value: currentPassword, useBiometric, timestamp})

        Navigation.dismissModal(this.props.componentId);
    }

    render() {
        const { password, step } = this.state
        const { type, timestamp } = this.props

        return (
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <KeyboardAvoidingView style={[styles.flex, {flexDirection: 'column', justifyContent: 'center', backgroundColor: '#202225'}]} behavior="padding">
                    <Image
                        style={{width: responsiveWidth(28), height: responsiveHeight(12), resizeMode: 'contain'}}
                        source={require('assets/icons/logo.png')}
                    />
                    <View style={{flexDirection: 'column', alignItems: 'center', marginTop: 20}}>
                        <Text style={{fontWeight: 'bold', color: 'white'}}>
                            {type == 1 || type == 2 ? global.strings['password.enterPINTitle'] : (!step ? global.strings['password.enterNewPINTitle'] : global.strings['password.repeatNewPINTitle'])}
                        </Text>
                    </View>
                    <View style={{width: '90%', marginTop: 20, marginBottom: 10}}>
                            <Input
                                placeholder={global.strings["password.enterPINTitle"]}
                                autoFocus={true}
                                secureTextEntry={true}
                                inputStyle={{fontSize: 14, textAlign: 'left', color: 'white'}}
                                containerStyle={{paddingHorizontal: 0, width: '90%', alignSelf: 'center'}}
                                placeholderTextColor='white'
                                onChangeText={(password) => this.setState({password})}
                                defaultValue={this.state.password}
                            />
                    </View>
                    <View style={{width: "90%", marginTop: 30, bottom: 10, left: 0, right: 0, justifyContent: 'center', alignItems: 'center'}}>
                        <Button
                            icon={{ name: "arrow-circle-right",
                                            size: 14,
                                            type: 'font-awesome',
                                            color: "white" }}
                            title={((type == 1) || (type == 2)) ? global.strings['password.enterPassword'] : (!step ? global.strings['password.setPassword'] : global.strings['password.confirmPassword'])}
                            containerStyle={{width: "100%", justifyContent: 'center'}}
                            buttonStyle={styles.buttonIn}
                            titleStyle={styles.buttonTitleIn}
                            onPress={() => this.processResult()}
                        />
                    </View>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        );
    }
}

class PinBadge extends PureComponent {
    render() {
        const { active } = this.props

        return (
            <View style={{height: 15, width: 15, borderRadius: 50, borderColor: 'black', borderWidth: 1, margin: 10, backgroundColor: active ? 'black' : 'white'}} />
        );
    }
}


PasswordScreen.propTypes = {
    password: PropTypes.shape({}).isRequired
};

export default connectPassword()(PasswordScreen);
