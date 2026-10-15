// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    ScrollView,
    AppState,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import {
    Text
} from 'react-native-elements';
import Icon from 'react-native-vector-icons/Entypo';
import { TRANSACTION_DETAILS_SCREEN, pushWalletList } from 'src/navigation';
import { Navigation } from 'react-native-navigation';
import { connectWallet } from 'src/redux';
import moment from "moment";
import { subscribeToAddresses, getTransactionHistory, getAddressBalance, getWalletBalanceFromUTXOs, checkMempool, numberWithCommas, convertMWCtoUSD, formatUSD, mergeTransactions, getPendingDelta, getWalletBalanceStrict  } from 'src/utils/WalletUtils';
import Config from 'react-native-config';

const styles = StyleSheet.create({
    flex: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start'
    },
    balanceContainer: {
        flexDirection: 'row',
        backgroundColor: '#202225',
        width: '100%',
        padding: 10,
        alignContent: 'space-between',
        justifyContent: 'space-between'
    },
    balanceTitle: {
        fontSize: 22,
        textAlign: 'center',
        fontWeight: 'bold',
        color: 'white'
    },
    balanceSubtitle: {
        color: 'white',
        textAlign: 'center',
        opacity: 0.8
    },
    usdValue: {
        color: 'white',
        textAlign: 'center',
        fontSize: 14,
        marginTop: 2,
        opacity: 0.8
    }
});

class WalletScreen extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            isSocketConnected: global.socketConnect?.status?.() ?? false,
            isApiOnline: false,
            appState: AppState.currentState,
            isRefreshing: false,
            usdValue: null
        };

        Navigation.mergeOptions(this.props.componentId, {
            bottomTabs: {
                currentTabIndex: 2,
            }
        });

        Navigation.events().bindComponent(this);
    }

    checkNetworkStatus = async () => {
        try {
            const res = await fetch(`${Config.API_BASE_URL}/status`); // or '/ping' if you have one
            const isOnline = res.ok;
            if (isOnline !== this.state.isApiOnline) {
                this.setState({ isApiOnline: isOnline });
            }
        } catch (e) {
            if (this.state.isApiOnline) this.setState({ isApiOnline: false });
        }
    };

    componentDidMount() {
        // ✅ AppState (new API)
        this.appStateSubscription = AppState.addEventListener(
            'change',
            this.handleAppStateChange
        );

        this.firstOpen();

        // 🔌 Socket polling
        this.connectInterval = setInterval(() => {
            const currentStatus = global.socketConnect?.status?.() ?? false;

            if (currentStatus !== this.state.isSocketConnected) {
                this.setState({ isSocketConnected: currentStatus });

                if (currentStatus) {
                    this.refreshHistory();
                }
            }
        }, 3000);

        // 🌐 Network polling
        this.networkInterval = setInterval(() => {
            this.checkNetworkStatus();
        }, 3000);

        // 🔄 Auto refresh: every 5s while a transaction is pending, otherwise every 20s
        this.pollInterval = setInterval(this.pollTick, 5000);
    }

    componentWillUnmount() {
        // 🧹 Clear intervals
        if (this.connectInterval) {
            clearInterval(this.connectInterval);
        }

        if (this.networkInterval) {
            clearInterval(this.networkInterval);
        }

        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }

        // 🧹 Remove AppState listener (new API)
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
        }
    }

    handleAppStateChange = (nextAppState) => {
        if (this.state.appState.match(/background/) && nextAppState === 'active') {
            global.socketConnect?.connect?.();
            pushWalletList();
        }
        this.setState({ appState: nextAppState });
    }

    // 🔄 Auto refresh timer tick (5s while something is pending, 20s otherwise)
    pollTick = () => {
        if (AppState.currentState !== 'active') return;

        const wallet = this.props.wallet[this.props.timestamp];
        if (!wallet) return;

        const hasPending = Object.values(wallet.transactions || {}).some(
            (t) => t && !(t.confirmations > 0)
        );

        const wait = hasPending ? 4500 : 19500;

        if (Date.now() - (this.lastPoll || 0) < wait) return;

        this.pollRefresh();
    }

    // Background refresh. Never shows the spinner, and if any request fails it keeps the
    // last good balance (instead of dropping to 0 like the manual refresh does).
    pollRefresh = async () => {
        const { updateWalletValues, setWalletValues, timestamp } = this.props;
        const wallet = this.props.wallet[timestamp];

        if (!wallet) return;

        const { addresses, transactions } = wallet;

        if (!addresses || Object.keys(addresses).length === 0) return;

        if (this.polling || this.state.isRefreshing) return;
        this.polling = true;
        this.lastPoll = Date.now();

        try {
            const newTransactions = await getTransactionHistory(global.socketConnect, addresses, transactions);

            // read the list again after the network call so a tx added meanwhile isn't lost
            const latest = this.props.wallet[timestamp].transactions;
            updateWalletValues({
                transactions: mergeTransactions(latest, newTransactions, { dropStalePending: true }),
                timestamp
            });

            const sats = await getWalletBalanceStrict(addresses, !!this.props.wallet[timestamp].isImported);
            const totalBalance = sats / 1e8;

            setWalletValues({
                balance: { confirmed: totalBalance },
                timestamp
            });

            const usd = await convertMWCtoUSD(totalBalance);
            this.setState({ usdValue: usd });
        } catch (e) {
            console.warn("pollRefresh error (keeping last balance):", e);
        }

        this.polling = false;
    };

    startCheckingMempool = () => {
        const { timestamp } = this.props;
        const { addresses } = this.props.wallet[timestamp];

        if (!addresses || addresses.length === 0) return;

        checkMempool(global.socketConnect, addresses, null, this.updateTransactionObjects);
    }

    updateTransactionObjects = async (transactionObjects, needUpdate) => {
        const { updateWalletValues, setWalletValues, timestamp } = this.props;
        const { transactions, addresses } = this.props.wallet[timestamp];

        if (!addresses || Object.keys(addresses).length === 0) return;

        if (needUpdate) {
            await this.refreshHistory();
            return;
        }

        const mergedTransactions = mergeTransactions(transactions, transactionObjects);
        updateWalletValues({ transactions: mergedTransactions, timestamp });

        // ✅ Balance + USD merge
        try {
            let totalBalance = 0;

            if (this.props.wallet[timestamp].isImported) {
                // 🔥 UTXO dedupe path (imported wallets only)
                const res = await getWalletBalanceFromUTXOs(addresses);
                totalBalance = (res.confirmed || 0) / 1e8;
            } else {
                // ✅ original logic (non-imported wallets)
                for (const addr of Object.keys(addresses)) {
                    const res = await getAddressBalance(addr);

                    if (res && res.confirmed != null) {
                        totalBalance += parseFloat(res.confirmed);
                    }
                }

                totalBalance = totalBalance / 1e8;
            }

            setWalletValues({
                balance: { confirmed: totalBalance },
                timestamp
            });

            // ✅ USD conversion (added)
            if (this.updateBalanceUSD) {
                const usd = await convertMWCtoUSD(totalBalance);
                this.setState({ usdValue: usd });
            }

        } catch (e) {
            console.warn("updateTransactionObjects balance error:", e);
            setWalletValues({ balance: { confirmed: 0 }, timestamp });
            this.setState({ usdValue: 0 });
        }
    };

    firstOpen = async () => {
        const { timestamp } = this.props;
        const { addresses } = this.props.wallet[timestamp];

        if (!addresses || addresses.length === 0) return;

        subscribeToAddresses(global.socketConnect, addresses, this.updateTransactionObjects);

        this.startCheckingMempool();

        await this.refreshHistory();
    }

    refreshHistory = async () => {
        const { updateWalletValues, setWalletValues, timestamp } = this.props;
        const { addresses, transactions } = this.props.wallet[timestamp];

        if (!addresses || Object.keys(addresses).length === 0) return;

        this.setState({ isRefreshing: true });

        try {
            // Pull latest transactions
            const newTransactions = await getTransactionHistory(global.socketConnect, addresses, transactions);
            const mergedTransactions = mergeTransactions(this.props.wallet[timestamp].transactions, newTransactions, { dropStalePending: true });

            updateWalletValues({ transactions: mergedTransactions, timestamp });

            // ✅ Real-time balance from API
            let totalBalance = 0;

            if (this.props.wallet[timestamp].isImported) {
                // 🔥 UTXO dedupe path (imported wallets only)
                const res = await getWalletBalanceFromUTXOs(addresses);
                totalBalance = (res.confirmed || 0) / 1e8;
            } else {
                // ✅ original logic (non-imported wallets)
                for (const addr of Object.keys(addresses)) {
                    const res = await getAddressBalance(addr);

                    if (res && res.confirmed != null) {
                        totalBalance += parseFloat(res.confirmed);
                    }
                }

                totalBalance = totalBalance / 1e8;
            }

            setWalletValues({
                balance: { confirmed: totalBalance },
                timestamp
            });

            // ✅ USD conversion (added)
            const usd = await convertMWCtoUSD(totalBalance);
            this.setState({ usdValue: usd });

        } catch (e) {
            console.warn("refreshHistory balance error:", e);
            setWalletValues({ balance: { confirmed: 0 }, timestamp });
            this.setState({ usdValue: 0 });
        }

        this.setState({ isRefreshing: false });
    };

    updateBalanceUSD = async (addresses, setWalletValues, timestamp) => {
        try {
            let totalBalance = 0;

            if (this.props.wallet[timestamp].isImported) {
                // 🔥 UTXO dedupe path (imported wallets only)
                const res = await getWalletBalanceFromUTXOs(addresses);
                totalBalance = (res.confirmed || 0) / 1e8;
            } else {
                // ✅ original logic (non-imported wallets)
                for (const addr of Object.keys(addresses)) {
                    const res = await getAddressBalance(addr);

                    if (res && res.confirmed != null) {
                        totalBalance += parseFloat(res.confirmed);
                    }
                }

                totalBalance = totalBalance / 1e8;
            }

            setWalletValues({
                balance: { confirmed: totalBalance },
                timestamp
            });

            const usd = await convertMWCtoUSD(totalBalance);
            this.setState({ usdValue: usd });

        } catch (e) {
            console.warn("updateBalanceUSD error:", e);
            setWalletValues({ balance: { confirmed: 0 }, timestamp });
            this.setState({ usdValue: 0 });
        }
    };

    openTransactionDetails = (transaction, timestamp) => {
        Navigation.showModal({
            stack: {
                children: [{
                    component: {
                        name: TRANSACTION_DETAILS_SCREEN,
                        passProps: {
                            transaction,
                            timestamp
                        },
                    }
                }]
            }
        });
    }

    renderTransaction = (transaction) => {
        const amountMWC = transaction.amount / Math.pow(10, 8);

        // ⚠️ you need your USD rate (assuming you stored it globally or in state)
        const usdRate = this.state.usdValue && this.props.wallet[this.props.timestamp].balance?.confirmed
            ? this.state.usdValue / this.props.wallet[this.props.timestamp].balance.confirmed
            : 0;

        const txUsdAmount = amountMWC * usdRate;

        return (
            <View style={{
                padding: 10,
                backgroundColor: 'white',
                width: "100%",
                flexDirection: 'row',
            }}>
                <Icon
                    name={transaction.type ? 'circle-with-minus' : 'circle-with-plus'}
                    size={25}
                    style={{ marginRight: 10, color: "black" }}
                />

                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row' }}>
                        <Text>
                            {transaction.type ? "Sent" : "Received"}
                            {!(transaction.confirmations > 0) &&
                                <Text style={{ color: '#e6a23c', fontWeight: 'bold' }}>{"  ·  Pending"}</Text>
                            }
                        </Text>

                        <Text style={{
                            flex: 1,
                            textAlign: 'right',
                            fontWeight: 'bold',
                            color: transaction.type ? "#d3515e" : "#71b888"
                        }}>
                            {(transaction.type ? "-" : "+") +
                                numberWithCommas(amountMWC.toFixed(8))} {Config.COIN_NAME}
                        </Text>
                    </View>

                    {/* ✅ USD value goes HERE */}
                    <Text style={{ opacity: 0.6 }}>
                        {formatUSD(txUsdAmount)}
                    </Text>

                    <Text numberOfLines={1}>{transaction.hash}</Text>
                    <Text>{moment.unix(transaction.time).format("DD MMM YYYY")}</Text>
                </View>
            </View>
        );
    };

    render() {
        const { timestamp } = this.props;

        if (!(timestamp in this.props.wallet)) {
            return <View />;
        }

        const { balance, transactions } = this.props.wallet[timestamp];
        const { isConnected, isRefreshing, usdValue } = this.state;

        const safeBalance = balance?.confirmed ?? 0;
        const pendingDelta = getPendingDelta(transactions);

        return (
            <View style={styles.flex}>
                <View style={styles.balanceContainer}>
                    <View style={{ width: "100%" }}>
                        {!isRefreshing ? (
                            <TouchableOpacity onPress={this.refreshHistory}>
                                <Text style={styles.balanceTitle}>
                                    {numberWithCommas(safeBalance.toFixed(8))} {Config.COIN_NAME}
                                </Text>
                                {usdValue != null && (
                                    <Text style={styles.usdValue}>
                                        ${usdValue.toFixed(8)}
                                    </Text>
                                )}
                                {pendingDelta !== 0 && (
                                    <Text style={styles.usdValue}>
                                        Pending: {pendingDelta > 0 ? "+" : "-"}{numberWithCommas(Math.abs(pendingDelta / 1e8).toFixed(8))} {Config.COIN_NAME}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <ActivityIndicator size="small" color="white" />
                        )}

                        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 10 }}>
                            <Text style={styles.balanceSubtitle}>
                                {global.strings['wallet.networkStatusTitle']}
                            </Text>

                            <Icon
                                name={'controller-record'}
                                size={15}
                                style={{
                                    marginLeft: 5,
                                    color: this.state.isSocketConnected && this.state.isApiOnline ? 'red' : 'lightgreen'
                                }}
                            />
                        </View>
                    </View>
                </View>

                <ScrollView style={{ width: '100%' }}>
                    {Object.keys(transactions)
                        .sort()
                        .reverse()
                        .map((time) => (
                            <TouchableOpacity
                                key={time}
                                onPress={() =>
                                    this.openTransactionDetails(transactions[time], timestamp)
                                }
                            >
                                {this.renderTransaction(transactions[time])}
                            </TouchableOpacity>
                        ))}
                </ScrollView>
            </View>
        );
    }
}

WalletScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(WalletScreen);
