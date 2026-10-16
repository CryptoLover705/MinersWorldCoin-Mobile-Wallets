// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    ScrollView,
    Image,
    TouchableOpacity
} from 'react-native';
import {
    Text,
} from 'react-native-elements';
import { WALLET_SCREEN, pushStarterStack, pushPasswordGate } from 'src/navigation';
import { getMirgationWallets, removeMirgationWallets, decryptData, decryptWallet, numberWithCommas, convertMWCtoUSD, getAddressBalance, getWalletBalanceFromUTXOs, generateAddresses, shouldDedupeBalance, getWalletBalanceStrict, summarizeLocks } from 'src/utils/WalletUtils';
import { Navigation } from 'react-native-navigation';
import { connectWallet } from 'src/redux';
import Config from 'react-native-config';

const styles = StyleSheet.create({
    flex: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
    basicContainer: { padding: 10, backgroundColor: 'white', alignSelf: 'center', justifyContent: 'flex-start', flexDirection: 'row', width: '100%', borderBottomColor: '#f0eff5', borderBottomWidth: 1 }
});

class WalletListScreen extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            actionsOverlay: false,
            actionAddress: {index: 0, address: "", name: ""}
        }

        Navigation.events().bindComponent(this);
    }

    componentDidMount() {
        const { defaultLanguage } = this.props.wallet;

        if (defaultLanguage) {
            let safeLang =
                typeof defaultLanguage === "string"
                    ? defaultLanguage
                    : "en";

            safeLang = safeLang.split("-")[0];

            global.strings.setLanguage(safeLang);
        }

        this.firstCheck();

        Navigation.mergeOptions(this.props.componentId, {
            topBar: {
                largeTitle: { visible: false, noBorder: true, fontSize: 30, fontFamily: 'HelveticaBold', color: 'white' },
                title: { text: global.strings['walletList.title'] },
                rightButtons: [{ color: 'white', id: 'addWallet', icon: require('../../assets/icons/ic_plus.png') }],
                leftButtons: [],
                backButton: {},
                visible: true,
            }
        })
    }

    navigationButtonPressed({ buttonId }) {
        if (buttonId == "addWallet") {
            pushStarterStack(1)
        }
    }

    firstCheck = async () => {
        const { addNewWallet, setWalletValues, setDefaultValues } = this.props;
        const { isCreated } = this.props.wallet;
        let wallets = await getMirgationWallets();

        if (wallets) {
            for (var i = 0; i < wallets.length; i++) {
                let timestamp = parseInt(new Date() / 1000) + i;

                addNewWallet({timestamp: timestamp});
                setWalletValues({isMigrated: false, isCreated: true, migrationData: wallets[i], title: wallets[i].title, timestamp: timestamp});
            }

            setDefaultValues({isCreated: true});
            await removeMirgationWallets();
        } else {
            if (!isCreated) {
                pushStarterStack();
            }
        }
    }

    openWalletScreen = async (timestamp) => {
        const { setWalletValues, wallet } = this.props;
        const { isMigrated, migrationData, receiveAddress, addresses } = wallet[timestamp];

        if (isMigrated) {
            // Auto-generate first receive address if missing
            if (!receiveAddress || !addresses || Object.keys(addresses).length === 0) {
                const seed = migrationData.seedPhrase.join(" ");
                const newAddresses = await generateAddresses(seed, Config.DERIVATION_PATH + "0", 0, 0);
                const firstAddress = Object.keys(newAddresses)[0];

                setWalletValues({ receiveAddress: firstAddress, timestamp });
                setWalletValues({ addresses: newAddresses, timestamp });
            }

            pushPasswordGate(1, timestamp)
        } else {
            pushPasswordGate(2, timestamp, (password) => {
                var decryptedPassword = decryptData(migrationData.password, password);

                if (decryptedPassword == password) {
                    let walletData = decryptWallet(migrationData, password);
                    walletData.timestamp = timestamp;

                    // Ensure first receive address exists for non-migrated wallet
                    if (!walletData.receiveAddress || !walletData.addresses || Object.keys(walletData.addresses).length === 0) {
                        const seed = walletData.seedPhrase.join(" ");
                        const newAddresses = generateAddresses(seed, Config.DERIVATION_PATH + "0", 0, 0);
                        const firstAddress = Object.keys(newAddresses)[0];
                        walletData.receiveAddress = firstAddress;
                        walletData.addresses = newAddresses;
                    }

                    setWalletValues(walletData);
                    return true;
                }

                return false;
            })
        }
    }

    render() {
        const wallets = this.props.wallet;

        return (
            <View style={[styles.flex, {alignSelf: 'center', width: '100%'}]}>
                <ScrollView style={{width: '100%'}}>
                    {
                        Object.keys(wallets).sort().map((timestamp, index) => (
                            wallets[timestamp].isCreated &&
                            <TouchableOpacity onPress={() => this.openWalletScreen(timestamp)} key={index}>
                                <WalletItem params={wallets[timestamp]} />
                            </TouchableOpacity>
                        ))
                    }
                </ScrollView>
            </View>
        );
    }
}

class WalletItem extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            usdValue: null,
            balance: null,
            lockedCoins: 0
        };

        this.polling = null;
    }

    async componentDidMount() {
        this.updateBalance();
        this.polling = setInterval(this.updateBalance, 10000); // auto-update every 10s
    }

    componentWillUnmount() {
        if (this.polling) clearInterval(this.polling);
    }

    updateBalance = async () => {
        const { params } = this.props;
        if (!params.isMigrated || !params.addresses || Object.keys(params.addresses).length === 0) return;

        try {
            let total = 0;

            if (shouldDedupeBalance(params)) {
                // 🔥 several addresses per key: count every coin once (by txid:index), not per address
                total = (await getWalletBalanceStrict(params.addresses, true)) / 1e8;
            } else if (params.isImported) {
                // 🔥 UTXO dedupe for imported wallets
                const res = await getWalletBalanceFromUTXOs(params.addresses);
                total = (res.confirmed || 0) / 1e8;
            } else {
                // ✅ original logic for normal wallets
                for (const addr of Object.keys(params.addresses)) {
                    const res = await getAddressBalance(addr);

                    if (res && res.confirmed != null) {
                        total += parseFloat(res.confirmed) / 1e8;
                    }
                }
            }

            // coins locked with the web wallet still belong to this wallet: include them in the total
            const lockSummary = summarizeLocks(params.locks, Math.floor(Date.now() / 1000));
            const lockedCoins = (lockSummary.lockedSats + lockSummary.readySats) / 1e8;
            total += lockedCoins;

            let usdValue = await convertMWCtoUSD(total);
            if (typeof usdValue !== "number" || isNaN(usdValue)) {
                usdValue = 0; // fallback if API failed
            }

            this.setState({ usdValue, balance: total, lockedCoins });

        } catch (e) {
            console.log("Error updating wallet balance/price", e);
            this.setState({ usdValue: 0 }); // fail-safe
        }
    }

    render = () => {
        const { params } = this.props;
        const { usdValue, balance } = this.state;

        return (
            <View style={styles.basicContainer}>
                <Image style={{width: 50, height: 50, marginRight: 10, borderRadius: 5}} source={require('assets/icons/logo.png')}/>
                <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start'}}>
                    <Text style={{fontSize: 16, color: "black"}} numberOfLines={2}>
                        <Text style={{fontWeight: 'bold'}}>{params.title}</Text>
                    </Text>
                    <Text style={{fontSize: 12, marginTop: 5}}>
                        {params.isMigrated ?
                            (balance !== null ? numberWithCommas(balance.toFixed(8)) + " " + Config.COIN_NAME : "Loading...") 
                            : global.strings['walletList.notMigrated']
                        }
                    </Text>
                    {this.state.lockedCoins > 0 && <Text style={{fontSize: 11, color: "#c98a1b", marginTop: 2}}>
                        {"incl. " + numberWithCommas(this.state.lockedCoins.toFixed(8)) + " " + Config.COIN_NAME + " locked"}
                    </Text>}
                    {usdValue != null && <Text style={{fontSize: 12, color: "black", marginTop: 2}}>
                        ${usdValue.toFixed(8)}
                    </Text>}
                </View>
            </View>
        );
    }
}

WalletListScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(WalletListScreen);
