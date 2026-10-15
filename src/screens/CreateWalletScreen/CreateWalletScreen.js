// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    Alert,
    Clipboard,
    ScrollView,
    KeyboardAvoidingView,
    Platform
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

// Pick `count` different word positions (sorted) to quiz the user on
function pickWordIndexes(total, count = 3) {
    const pool = Array.from({ length: total }, (_, i) => i);

    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.slice(0, Math.min(count, total)).sort((a, b) => a - b);
}

// true only if every asked word matches (ignores case and stray spaces)
function backupAnswersCorrect(seedPhrase, indexes, answers) {
    return indexes.every((wordIndex, i) =>
        (answers[i] || "").trim().toLowerCase() === String(seedPhrase[wordIndex] || "").toLowerCase()
    );
}

class CreateWalletScreen extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            seedPhrase: generateSeedPhrase(),
            title: "",
            timestamp: 0,
            verifying: null,
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
                                        onPress : () => this.startBackupCheck(title),
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

    // ---- backup check: re-enter 3 random words before the wallet is created ----
    startBackupCheck = (title) => {
        const indexes = pickWordIndexes(this.state.seedPhrase.length, 3);

        this.setState({
            verifying: { title, indexes, answers: indexes.map(() => ""), error: false }
        });
    }

    checkBackup = () => {
        const { seedPhrase, verifying } = this.state;

        if (backupAnswersCorrect(seedPhrase, verifying.indexes, verifying.answers)) {
            const { title } = verifying;

            this.setState({ verifying: null });
            this.openPasswordScreen(title);
        } else {
            this.setState({ verifying: { ...verifying, error: true } });
        }
    }

    renderBackupCheck = () => {
        const { verifying } = this.state;

        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[StyleSheet.absoluteFillObject, { backgroundColor: 'white' }]}
            >
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
                    <Text h4 style={{ fontWeight: 'bold', color: 'black', textAlign: 'center' }}>
                        Confirm your backup
                    </Text>
                    <Text style={{ fontSize: 14, color: 'black', textAlign: 'center', marginTop: 10, marginBottom: 20 }}>
                        Enter these words from the seed phrase you just saved. Without a backup your funds can't be recovered if you lose this phone.
                    </Text>

                    {verifying.indexes.map((wordIndex, i) => (
                        <Input
                            key={wordIndex}
                            label={"Word #" + (wordIndex + 1)}
                            labelStyle={{ color: 'black' }}
                            autoCapitalize="none"
                            autoCorrect={false}
                            spellCheck={false}
                            value={verifying.answers[i]}
                            containerStyle={{ width: '100%', marginBottom: 10 }}
                            inputStyle={{ fontSize: 16, color: 'black' }}
                            renderErrorMessage={false}
                            onChangeText={(text) => {
                                const answers = verifying.answers.slice();
                                answers[i] = text;
                                this.setState({ verifying: { ...verifying, answers, error: false } });
                            }}
                        />
                    ))}

                    {verifying.error &&
                        <Text style={{ color: '#d3515e', fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>
                            One or more words are incorrect. Check your seed phrase and try again.
                        </Text>
                    }

                    <Button
                        icon={{ name: "check-circle", size: 14, type: 'font-awesome', color: "white" }}
                        title="Confirm backup"
                        containerStyle={{ width: "100%", marginTop: 10, justifyContent: 'center' }}
                        buttonStyle={styles.buttonIn}
                        titleStyle={styles.buttonTitleIn}
                        onPress={this.checkBackup}
                    />
                    <Button
                        title="Back to my seed phrase"
                        type="clear"
                        containerStyle={{ width: "100%", marginTop: 10, justifyContent: 'center' }}
                        titleStyle={styles.buttonTitleOut}
                        onPress={() => this.setState({ verifying: null })}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    openPasswordScreen = (title) => {
        const { seedPhrase } = this.state;
        const { addNewWallet, setWalletValues } = this.props;

        var timestamp = parseInt(new Date() / 1000);
        while (timestamp in this.props.wallet) {
            timestamp += 1;
        }

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
                {this.state.verifying && this.renderBackupCheck()}
            </View>
        );
    }
}

CreateWalletScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectPassword()(connectWallet()(CreateWalletScreen));
