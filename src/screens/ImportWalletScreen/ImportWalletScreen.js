// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    Alert,
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
        width: '95%',
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
        fontWeight: 'bold',
        color: 'white'
    },
    buttonTitleOut: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    mnemonicButton: {
        borderColor: '#000773',
        borderRadius: 8,
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
        color: '#1921c1'
    },
});

class ImportWalletScreen extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            seedPhrase: [],
            title: "",
            timestamp: 0
        }

        this.modalDismissedListener = null;

        Navigation.mergeOptions(this.props.componentId, {
            topBar: {
                title: {
                    text: global.strings['importWallet.title']
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
                        genarateType: 1,
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

    warningPopUp = () => {
        const { seedPhrase, title } = this.state;
        var processedSeedPhrase = seedPhrase.filter(function (str) { return str !== ""; });

        if (processedSeedPhrase.length >= 12) {
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
                    Alert.alert(
                        global.strings['importWallet.title'],
                        global.strings['importWallet.walletImportAlert'],
                        [
                            {
                                text: global.strings['importWallet.doNotImportWalletButton'],

                            },
                            {
                                text: global.strings['importWallet.importWalletButton'],
                                onPress : () => this.openPasswordScreen(title, processedSeedPhrase),
                            },
                        ],
                        {cancelable: false},
                    );
            }
        } else {
            Alert.alert(
                global.strings['importWallet.title'],
                global.strings['importWallet.invalidSeedAlert'],
                [
                    {
                        text: global.strings['importWallet.confirmAlertButton'],
                    },
                ],
                {cancelable: false},
            );
        }
    }

    openPasswordScreen = (title, processedSeedPhrase) => {
        const { setWalletValues, addNewWallet } = this.props;

        var timestamp = parseInt(new Date() / 1000);

        this.setState({timestamp});

        addNewWallet({timestamp: timestamp});
        setWalletValues({seedPhrase: processedSeedPhrase, title: title, timestamp: timestamp});
        pushPasswordGate(0, timestamp);
    }

    render() {
        const { title } = this.state;

        return (
            <View style={[styles.flex]}>
                    <ScrollView style={{width: '100%', flex: 1}}>

                        <View style={styles.basicContainer}>
                            <View style={{flexDirection: 'row', justifyContent: 'center', alignItems:'center'}}>
                                <Text h4 style={{fontWeight: 'bold', color: 'black'}}>
                                    {global.strings['importWallet.seedSubtitle']}
                                </Text>
                            </View>
                            <Divider style={{marginTop: -15, marginBottom: -15, marginTop: 5, marginBottom: 5, height: 2, backgroundColor: 'gray'}}/>
                            <View style={{flexWrap: 'wrap', flexDirection: 'row', flexBasis: 'auto', justifyContent: 'space-between', alignSelf: 'center'}}>
                                <Input
                                    placeholder={global.strings['importWallet.seedInput']}
                                    multiline={true}
                                    autoCorrect={false}
                                    autoCapitalize = 'none'
                                    containerStyle={{flex: 1, minHeight: 75, maxHeight: 100}}
                                    numberOfLines={1}
                                    onChangeText={(text) => this.setState({seedPhrase: text.split(" ")})}
                                    inputContainerStyle={{borderColor: "white"}}
                                    inputStyle={{fontSize: 14, borderColor: 'white'}} />
                            </View>
                            <Divider style={{marginTop: -15, marginBottom: -15, marginTop: 5, marginBottom: 5, height: 1, backgroundColor: '#f0eff5'}}/>
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
                            {global.strings['importWallet.tooltipText']}
                        </Text>
                    </ScrollView>
                    <View style={{position: "absolute", bottom: 10, left: 0, right: 0, justifyContent: 'center', alignItems: 'center'}}>
                        <Button
                                icon={{ name: "arrow-circle-right",
                                            size: 14,
                                            type: 'font-awesome',
                                            color: "white" }}

                            title={global.strings['importWallet.nextButton']}
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

ImportWalletScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectPassword()(connectWallet()(ImportWalletScreen));
