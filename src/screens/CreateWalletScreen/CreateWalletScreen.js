// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    Alert,
    Clipboard,
    ScrollView
} from 'react-native';
import {
    Text,
    Button,
    Divider,
    Input
} from 'react-native-elements';
import { GENERATE_WALLET_SCREEN, WALLET_LIST_SCREEN, pushPasswordGate } from 'src/navigation';
import { Navigation } from 'react-native-navigation';
import { connectWallet, connectPassword } from 'src/redux';
import { generateSeedPhrase } from 'src/utils/WalletUtils';

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
        flexDirection: 'column',
        width: '95%'
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
        color: 'black',
        fontSize: 14,
        fontWeight: 'bold'
    },
    mnemonicButton: {
        borderColor: '#A9A9A9',
        borderWidth: 1.2,
        borderRadius: 14,
        padding: 4,
        paddingLeft: 6,
        paddingRight: 6,
    },
    mnemonicButtonContainer: {
        width: '30%',
        marginTop: 6,
        marginBottom: 6,
    },
    mnemonicButtonTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#404040'
    },
});

class CreateWalletScreen extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            seedPhrase: generateSeedPhrase(),
            title: "",
            timestamp: 0,
        }

        this.modalDismissedListener = null;

        Navigation.mergeOptions(this.props.componentId, {
            topBar: {
                title: {
                    text: global.strings['createWallet.title']
                },
                visible: true,
            }
        })

        Navigation.events().bindComponent(this);
    }

    componentDidMount() {
        this.modalDismissedListener = Navigation.events().registerModalDismissedListener(({ componentId, modalsDismissed }) => {
            const { timestamp } = this.state;
            const { password } = this.props;

            if (timestamp in password) {
                Navigation.push(this.props.componentId, {
                component: {
                    passProps: {
                        genarateType: 0,
                        timestamp: this.state.timestamp
                    },
                    name: GENERATE_WALLET_SCREEN,
                    options: {
                        topBar: {
                                visible: false
                            }
                        }
                    }
                });
            }
        });
    }

    componentWillUnmount() {
        this.modalDismissedListener.remove();
    }

    copySeedPhrase = async () => {
        const { seedPhrase } = this.state;

        await Clipboard.setString(seedPhrase.join(" "));
        Alert.alert(
            global.strings['createWallet.title'],
            global.strings['createWallet.copyAlert'],
            [
                {
                    text: global.strings['createWallet.confirmAlertButton'],
                },
            ],
            {cancelable: false},
        );
    }

    titleIsUnique = (title) => {
            var wallets = Object.values(Object.values(this.props.wallet));

            for (timestamp in this.props.wallet) {
                    if (this.props.wallet[timestamp].isCreated && this.props.wallet[timestamp].title == title) {
                         return false;
                    }
            }

            return true;
    }

    warningPopUp = () => {
            const { title } = this.state;

            if(title.length < 3) {
                    Alert.alert(
                        global.strings['importWallet.title'],
                        global.strings['importWallet.invalidTitle'],
                        [
                            {
                                text: global.strings['importWallet.confirmAlertButton'],
                            },
                        ],
                        {cancelable: false},
                    );
            } else {
                    if(this.titleIsUnique(title)) {
                            Alert.alert(
                                global.strings['createWallet.title'],
                                global.strings['createWallet.walletCreateAlert'],
                                [
                                    {
                                        text: global.strings['createWallet.doNotCreateWalletButton'],

                                    },
                                    {
                                        text: global.strings['createWallet.createWalletButton'],
                                        onPress : () => this.openPasswordScreen(title),
                                    },
                                ],
                                {cancelable: false},
                            );
                    } else {
                            Alert.alert(
                                global.strings['importWallet.title'],
                                global.strings['importWallet.notUniqueTitle'],
                                [
                                    {
                                        text: global.strings['importWallet.confirmAlertButton'],
                                    },
                                ],
                                {cancelable: false},
                            );
                    }
            }
    }

    openPasswordScreen = (title) => {
        const { seedPhrase } = this.state;
        const { addNewWallet, setWalletValues } = this.props;

        var timestamp = parseInt(new Date() / 1000);

        this.setState({timestamp});

        addNewWallet({timestamp: timestamp});
        setWalletValues({seedPhrase: seedPhrase, title: title, timestamp: timestamp});

        pushPasswordGate(0, timestamp);
    }


    render() {
        const { seedPhrase, title } = this.state;

        return (
            <View style={[styles.flex, {alignContent: 'flex-start', flexDirection: 'column', justifyContent: 'space-between'}]}>
                <ScrollView style={{width: '100%', flex: 1}}>
                    <View style={styles.basicContainer}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems:'center'}}>
                            <Text h4 style={{fontWeight: 'bold', color: 'black'}}>
                                {global.strings['createWallet.seedSubtitle']}
                            </Text>
                            <Button
                                type='clear'
                                icon={{ name: "clipboard",
                                                size: 14,
                                                type: 'font-awesome',
                                                color: "black" }}

                                title={global.strings['createWallet.copyButton']}

                                buttonStyle={[styles.buttonOut, {margin: 0}]}
                                titleStyle={styles.buttonTitleOut}
                                onPress={() => this.copySeedPhrase()}
                            />
                        </View>
                        <Divider style={{marginTop: -15, marginBottom: -15, marginTop: 5, marginBottom: 5, height: 2, backgroundColor: 'gray'}}/>
                        <View style={{flexWrap: 'wrap', flexDirection: 'row', flexBasis: 'auto', marginBottom: 6, justifyContent: 'space-between', alignSelf: 'center'}}>
                            {
                                seedPhrase.map((word, key) => (
                                    <Button
                                        key={key}
                                        type="outline"
                                        title={word}
                                        containerStyle={styles.mnemonicButtonContainer}
                                        buttonStyle={styles.mnemonicButton}
                                        titleStyle={styles.mnemonicButtonTitle}
                                        onPress={() => this.copySeedPhrase()}
                                    />
                                ))
                            }
                        </View>
                        <Divider style={{marginTop: -15, marginBottom: -15, marginTop: 5, marginBottom: 5, height: 2, backgroundColor: '#f0eff5'}}/>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Text style={{fontSize: 14, fontWeight: 'bold', color: 'black'}}>
                                {global.strings['importWallet.walletTitle']}
                            </Text>
                            <Input
                                containerStyle={{flex: 1}}
                                inputContainerStyle={{borderColor: "white"}}
                                inputStyle={{fontSize: 14}}
                                placeholder={global.strings['importWallet.walletTitleExampleInput']}
                                renderErrorMessage={false}
                                value={title}
                                onChangeText={(title) => this.setState({title})}
                            />
                        </View>
                    </View>
                    <Text style={{width: '90%', marginTop: 10, fontSize: 12, color: 'black', alignSelf: 'center', flex: 1}}>
                        {global.strings['createWallet.tooltipText']}
                    </Text>
                </ScrollView>
                <View style={{position: "absolute", bottom: 10, left: 0, right: 0, justifyContent: 'center', alignItems: 'center'}}>
                        <Button
                            icon={{ name: "arrow-circle-right",
                                            size: 14,
                                            type: 'font-awesome',
                                            color: "white" }}

                            title={global.strings['createWallet.nextButton']}
                            containerStyle={{width: "100%", marginTop: 10, marginBottom: 10, justifyContent: 'center'}}
                            buttonStyle={styles.buttonIn}
                            titleStyle={styles.buttonTitleIn}
                            onPress={() => this.warningPopUp()}
                        />
                    </View>
            </View>
        );
    }
}

CreateWalletScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectPassword()(connectWallet()(CreateWalletScreen));
