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

import {
    GENERATE_WALLET_SCREEN,
    pushPasswordGate
} from 'src/navigation';

import { Navigation } from 'react-native-navigation';
import { connectWallet, connectPassword } from 'src/redux';
import { isValidWIF, generateAddressesFromWIF } from 'src/utils/WalletUtils';

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
    buttonTitleIn: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'white'
    }
});

class ImportWalletScreen extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            seedPhrase: [],
            wifKey: "",
            title: "",
            timestamp: 0
        };

        this.modalDismissedListener = null;

        Navigation.mergeOptions(this.props.componentId, {
            topBar: {
                title: {
                    text: global.strings['importWallet.title']
                },
                visible: true,
            }
        });

        Navigation.events().bindComponent(this);
    }

    componentDidMount() {
        this.modalDismissedListener =
            Navigation.events().registerModalDismissedListener(() => {
                const { timestamp } = this.state;
                const { password } = this.props;

                if (timestamp in password) {

                    Navigation.push(this.props.componentId, {
                        component: {
                            name: 'starter.GenerateWalletScreen',
                            passProps: {
                                timestamp: timestamp,
                                genarateType: 1
                            },
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
        if (this.modalDismissedListener) {
            this.modalDismissedListener.remove();
        }
    }

    // -----------------------------
    // WARNING / CONFIRMATION
    // -----------------------------
    titleIsUnique = (title) => {
        const { wallet } = this.props;

        return !Object.keys(wallet).some(ts =>
            wallet[ts] &&
            typeof wallet[ts] === 'object' &&
            wallet[ts].isCreated &&
            wallet[ts].title === title
        );
    };

    // Returns the key (timestamp) of an existing wallet that already holds this seed phrase /
    // private key, or undefined. Seeds compare ignoring case; a private key also matches when
    // one of its addresses is already inside another wallet.
    findDuplicateWallet = (seedWords, cleanWif) => {
        const { wallet } = this.props;
        const wantedSeed = seedWords.map(w => String(w).toLowerCase()).join(" ");

        let wifAddresses = [];
        if (cleanWif) {
            try {
                wifAddresses = Object.keys(generateAddressesFromWIF(cleanWif));
            } catch (e) {}
        }

        return Object.keys(wallet).find((ts) => {
            const w = wallet[ts];

            if (!w || typeof w !== 'object' || !w.isCreated) return false;

            if (cleanWif) {
                if (w.wifKey && w.wifKey === cleanWif) return true;

                return !!w.addresses && wifAddresses.some(a => a in w.addresses);
            }

            return Array.isArray(w.seedPhrase) &&
                w.seedPhrase.map(x => String(x).toLowerCase()).join(" ") === wantedSeed;
        });
    };

    showDuplicateAlert = (existingTs, isWif) => {
        const existing = this.props.wallet[existingTs];

        Alert.alert(
            global.strings['importWallet.title'],
            "This " + (isWif ? "private key" : "seed phrase") + " has already been imported as \"" + existing.title + "\", so it can't be imported again.",
            [
                { text: "OK", style: "cancel" },
                { text: "Open existing wallet", onPress: () => pushPasswordGate(1, existingTs) }
            ],
            { cancelable: false }
        );
    };

    warningPopUp = () => {

        const { seedPhrase, wifKey, title } = this.state;

        const processedSeedPhrase = seedPhrase.filter(str => str !== "");
        const cleanWif = (wifKey || "").trim();
        const isWif = cleanWif.length > 0;

        // VALIDATION

        if (isWif && processedSeedPhrase.length > 0) {
            Alert.alert(
                global.strings['importWallet.title'],
                "Enter either a seed phrase OR a private key (WIF), not both.",
                [{ text: "OK" }],
                { cancelable: false }
            );
            return;
        }

        if (!isWif && ![12, 24].includes(processedSeedPhrase.length)) {
            Alert.alert(
                global.strings['importWallet.title'],
                global.strings['importWallet.invalidSeedAlert'],
                [{ text: "OK" }],
                { cancelable: false }
            );
            return;
        }

        if (isWif && !isValidWIF(cleanWif)) {
            Alert.alert(
                "Invalid Private Key",
                "Please enter a valid WIF/private key.",
                [{ text: "OK" }],
                { cancelable: false }
            );
            return;
        }

        if (title.length < 3) {
            Alert.alert(
                global.strings['importWallet.title'],
                global.strings['importWallet.invalidTitle'],
                [{ text: "OK" }],
                { cancelable: false }
            );
            return;
        }

        if (!this.titleIsUnique(title)) {
            Alert.alert(
                global.strings['importWallet.title'],
                global.strings['importWallet.notUniqueTitle'],
                [{ text: "OK" }],
                { cancelable: false }
            );
            return;
        }

        // DUPLICATE CHECK: a seed / key that is already a wallet in this app can't be imported again
        const existingTs = this.findDuplicateWallet(processedSeedPhrase, isWif ? cleanWif : "");

        if (existingTs) {
            this.showDuplicateAlert(existingTs, isWif);
            return;
        }

        // CONFIRMATION (importing never touches your existing wallets)

        Alert.alert(
            isWif ? "Import Private Key" : global.strings['importWallet.title'],

            isWif
                ? "This private key will be added as a NEW, separate wallet.\n\n" +
                  "Your existing wallets are not changed."
                : global.strings['importWallet.walletImportAlert'],

            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: isWif
                        ? "Import Private Key"
                        : global.strings['importWallet.importWalletButton'],

                    onPress: () =>
                        this.openPasswordScreen(
                            title,
                            processedSeedPhrase
                        )
                }
            ],

            { cancelable: false }
        );
    };

    // -----------------------------
    // IMPORT HANDLER
    // -----------------------------
    openPasswordScreen = (title, processedSeedPhrase) => {

        const { setWalletValues, addNewWallet, wallet } = this.props;
        const { wifKey } = this.state;

        // last line of defence: never create a second wallet for the same seed / key
        const duplicateTs = this.findDuplicateWallet(
            processedSeedPhrase,
            (wifKey && wifKey.trim()) ? wifKey.trim() : ""
        );

        if (duplicateTs) {
            this.showDuplicateAlert(duplicateTs, !!(wifKey && wifKey.trim()));
            return;
        }

        // Wallets are keyed by timestamp. Make sure the key is brand new so we
        // can never land on (and reset) an existing wallet.
        let timestamp = parseInt(Date.now() / 1000);
        while (wallet && timestamp in wallet) {
            timestamp += 1;
        }

        this.setState({ timestamp });

        addNewWallet({ timestamp });

        if (wifKey && wifKey.trim().length > 0) {

            // WIF IMPORT (one key -> legacy + segwit + bech32 addresses)
            setWalletValues({
                wifKey: wifKey.trim(),
                title,
                timestamp,
                type: "wif",
                isImported: true
            });

        } else {

            // SEED IMPORT
            setWalletValues({
                seedPhrase: processedSeedPhrase,
                title,
                timestamp,
                type: "seed"
            });
        }

        pushPasswordGate(0, timestamp);
    };

    // -----------------------------
    // RENDER
    // -----------------------------
    render() {

        const { title } = this.state;

        return (
            <View style={styles.flex}>

                <ScrollView style={{ width: '100%', flex: 1 }}>

                    <View style={styles.basicContainer}>

                        <Text
                            h4
                            style={{
                                fontWeight: 'bold',
                                color: 'black'
                            }}
                        >
                            {global.strings['importWallet.seedSubtitle']}
                        </Text>

                        <Divider
                            style={{
                                height: 1,
                                backgroundColor: 'gray',
                                marginVertical: 10
                            }}
                        />

                        {/* SEED INPUT */}

                        <Input
                            placeholder={
                                global.strings['importWallet.seedInput']
                            }

                            multiline

                            autoCorrect={false}

                            autoCapitalize="none"

                            containerStyle={{
                                flex: 1,
                                minHeight: 75
                            }}

                            onChangeText={(text) =>
                                this.setState({
                                    seedPhrase: text.trim().toLowerCase().split(/\s+/)
                                })
                            }
                        />

                        <Divider
                            style={{
                                height: 1,
                                backgroundColor: '#f0eff5',
                                marginVertical: 10
                            }}
                        />

                        {/* OR: PRIVATE KEY (WIF) */}

                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: 'bold',
                                color: 'black'
                            }}
                        >
                            Or import a private key (WIF)
                        </Text>

                        <Input
                            placeholder="Private key (WIF)"

                            autoCorrect={false}

                            autoCapitalize="none"

                            secureTextEntry

                            onChangeText={(wifKey) =>
                                this.setState({ wifKey })
                            }
                        />

                        <Divider
                            style={{
                                height: 1,
                                backgroundColor: '#f0eff5',
                                marginVertical: 10
                            }}
                        />

                        {/* TITLE */}

                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: 'bold',
                                color: 'black'
                            }}
                        >
                            {global.strings['importWallet.walletTitle']}
                        </Text>

                        <Input
                            placeholder={
                                global.strings[
                                    'importWallet.walletTitleExampleInput'
                                ]
                            }

                            value={title}

                            onChangeText={(title) =>
                                this.setState({ title })
                            }
                        />

                    </View>

                    <Text
                        style={{
                            width: '90%',
                            marginTop: 10,
                            fontSize: 12,
                            color: 'black',
                            alignSelf: 'center'
                        }}
                    >
                        {global.strings['importWallet.tooltipText']}
                    </Text>

                </ScrollView>

                <View
                    style={{
                        position: "absolute",
                        bottom: 10,
                        left: 0,
                        right: 0,
                        alignItems: 'center'
                    }}
                >

                    <Button
                        title={
                            global.strings['importWallet.nextButton']
                        }

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
