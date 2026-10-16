// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    ScrollView,
    AppState,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import {
    Text,
    Input,
    Button
} from 'react-native-elements';
import Icon from 'react-native-vector-icons/Entypo';
import { TRANSACTION_DETAILS_SCREEN, pushWalletList } from 'src/navigation';
import { Navigation } from 'react-native-navigation';
import { connectWallet } from 'src/redux';
import moment from "moment";
import { subscribeToAddresses, getTransactionHistory, getAddressBalance, getWalletBalanceFromUTXOs, checkMempool, numberWithCommas, convertMWCtoUSD, formatUSD, mergeTransactions, getPendingDelta, getWalletBalanceStrict, getWalletLockPubkey, findLockUnlockTime, findLockInRange, getLockBalance, collectLockCandidates, summarizeLocks, formatLockRemaining, parseUnlockInput, lockAddress, shouldDedupeBalance  } from 'src/utils/WalletUtils';
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
            usdValue: null,
            nowSec: Math.floor(Date.now() / 1000),
            showLocks: false,
            scanningLocks: false,
            lockInput: "",
            addingLock: false
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

        // 🔒 keeps the "unlocks in ..." countdown ticking
        this.lockClock = setInterval(() => {
            this.setState({ nowSec: Math.floor(Date.now() / 1000) });
        }, 30000);
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

        if (this.lockClock) {
            clearInterval(this.lockClock);
        }

        this.unmounted = true;

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

    // 🔒 Time locks (P2SH CLTV locks created with the web wallet) ---------------------------
    // Finds the wallet's locks and keeps their balances current. Runs at most once a minute.
    refreshLocks = async (force = false) => {
        const { setWalletValues, timestamp } = this.props;
        const wallet = this.props.wallet[timestamp];

        if (!wallet || this.lockBusy || this.unmounted) return;

        const pubkey = getWalletLockPubkey(wallet);
        if (!pubkey) return;

        if (force !== true && Date.now() - (this.lastLockCheck || 0) < 60000) return;
        this.lastLockCheck = Date.now();
        this.lockBusy = true;

        try {
            const locks = { ...(wallet.locks || {}) };
            const lockScan = { ...(wallet.lockScan || {}) };
            let changed = false;

            // 1. P2SH addresses we have paid that could be our locks. Only ones that still hold
            //    coins are worth the search, and at most 2 per pass to keep the phone cool.
            const todo = collectLockCandidates(wallet.transactions, wallet.addresses)
                .filter((c) => !locks[c.address] && !lockScan[c.address]);

            let searched = 0;
            for (const candidate of todo) {
                if (searched >= 2 || this.unmounted) break;

                let balance;
                try {
                    balance = await getLockBalance(candidate.address);
                } catch (e) {
                    continue; // network hiccup: try again next pass
                }

                if (!(balance > 0)) continue;

                searched++;
                this.setState({ scanningLocks: true });

                const unlockTime = await findLockUnlockTime(pubkey, candidate.address, candidate.fundTime, () => this.unmounted);
                if (this.unmounted) return;

                lockScan[candidate.address] = { at: Date.now() };
                changed = true;

                if (unlockTime) {
                    locks[candidate.address] = { address: candidate.address, unlockTime, pubkey, balance };
                }
            }

            // 2. current balance of every known lock (0 once it has been redeemed)
            for (const address of Object.keys(locks)) {
                try {
                    const balance = await getLockBalance(address);

                    if (balance !== locks[address].balance) {
                        locks[address] = { ...locks[address], balance };
                        changed = true;
                    }
                } catch (e) {
                    // keep the last known balance
                }
            }

            if (changed && !this.unmounted) {
                setWalletValues({ locks, lockScan, timestamp });
            }
        } catch (e) {
            console.warn("refreshLocks error:", e);
        } finally {
            this.lockBusy = false;
            if (!this.unmounted) this.setState({ scanningLocks: false });
        }
    };

    // Manual add: the user types the unlock time shown in the web wallet.
    addManualLock = async () => {
        const { setWalletValues, timestamp } = this.props;
        const wallet = this.props.wallet[timestamp];
        const say = (message) => Alert.alert("Time locks", message);

        const pubkey = getWalletLockPubkey(wallet);
        if (!pubkey) return say("This wallet has no key to check locks with.");

        const parsed = parseUnlockInput(this.state.lockInput);
        if (!parsed) {
            return say("Enter the unlock time as unix seconds (for example 1790000000) or as YYYY-MM-DD HH:mm.");
        }

        this.setState({ addingLock: true });

        try {
            let address = null;
            let unlockTime = null;

            if (parsed.exact) {
                unlockTime = parsed.exact;
                address = lockAddress(unlockTime, pubkey);
            } else {
                // minute precision: look for a lock among the addresses we have paid
                const known = collectLockCandidates(wallet.transactions, wallet.addresses).map((c) => c.address);
                const hit = await findLockInRange(pubkey, known, parsed.from, parsed.to);

                if (hit) {
                    address = known[hit.index];
                    unlockTime = hit.unlockTime;
                }
            }

            if (!address) {
                return say("No lock from this wallet matches that time. Try the exact unix seconds from the web wallet.");
            }

            const balance = await getLockBalance(address);

            if (!(balance > 0)) {
                return say("No coins were found at the lock address for that unlock time. Double-check the time.");
            }

            setWalletValues({
                locks: { ...(wallet.locks || {}), [address]: { address, unlockTime, pubkey, balance, manual: true } },
                timestamp
            });

            this.setState({ lockInput: "" });
            say("Lock added.");
        } catch (e) {
            say("Couldn't check the lock right now. Check your connection and try again.");
        } finally {
            if (!this.unmounted) this.setState({ addingLock: false });
        }
    };

    // Total / locked / available, shown when the wallet has locked coins
    renderBalanceBreakdown = (summary, available, nowSec) => {
        const { usdValue } = this.state;
        const lockedCoins = summary.lockedSats / 1e8;
        const readyCoins = summary.readySats / 1e8;
        const total = available + lockedCoins + readyCoins;
        const amount = (n) => numberWithCommas(n.toFixed(8)) + " " + Config.COIN_NAME;
        const row = { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 };

        return (
            <View style={{ width: '100%', paddingHorizontal: 5 }}>
                <View style={[row, { marginTop: 0 }]}>
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Total balance</Text>
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{amount(total)}</Text>
                </View>

                {summary.lockedSats > 0 && (
                    <TouchableOpacity onPress={() => this.setState({ showLocks: true })}>
                        <View style={row}>
                            <Text style={{ color: 'white', opacity: 0.9, fontSize: 14 }}>Locked coins</Text>
                            <Text style={{ color: '#e6a23c', fontSize: 14, fontWeight: 'bold' }}>{amount(lockedCoins)}</Text>
                        </View>
                        <Text style={{ color: 'white', opacity: 0.7, fontSize: 12, textAlign: 'right' }}>
                            {"Unlocks in " + formatLockRemaining(summary.nextUnlock - nowSec) +
                                (summary.lockedCount > 1 ? "  ·  " + summary.lockedCount + " locks" : "")}
                        </Text>
                    </TouchableOpacity>
                )}

                {summary.readySats > 0 && (
                    <TouchableOpacity onPress={() => this.setState({ showLocks: true })}>
                        <View style={row}>
                            <Text style={{ color: 'white', opacity: 0.9, fontSize: 14 }}>Unlocked (redeem in web wallet)</Text>
                            <Text style={{ color: '#71b888', fontSize: 14, fontWeight: 'bold' }}>{amount(readyCoins)}</Text>
                        </View>
                    </TouchableOpacity>
                )}

                <View style={row}>
                    <Text style={{ color: 'white', opacity: 0.9, fontSize: 14 }}>Available coins</Text>
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>{amount(available)}</Text>
                </View>

                {usdValue != null && (
                    <Text style={{ color: 'white', opacity: 0.7, fontSize: 12, textAlign: 'right', marginTop: 2 }}>
                        Available ≈ ${usdValue.toFixed(8)}
                    </Text>
                )}
            </View>
        );
    };

    renderLocksPanel = (summary, nowSec) => {
        const { scanningLocks, addingLock, lockInput } = this.state;
        const amount = (sats) => numberWithCommas((sats / 1e8).toFixed(8)) + " " + Config.COIN_NAME;

        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[StyleSheet.absoluteFillObject, { backgroundColor: 'white' }]}
            >
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'black', textAlign: 'center' }}>Time locks</Text>
                    <Text style={{ fontSize: 13, color: '#555', textAlign: 'center', marginTop: 8, marginBottom: 15 }}>
                        Coins you locked with the web wallet are held at a lock address (it starts with 5) until the unlock time.
                        They are not spendable here until then.
                    </Text>

                    {scanningLocks && (
                        <Text style={{ color: '#555', textAlign: 'center', marginBottom: 10 }}>Checking your transactions for locks…</Text>
                    )}

                    {summary.list.length === 0 && !scanningLocks && (
                        <Text style={{ color: 'black', textAlign: 'center', marginBottom: 15 }}>No locked coins found for this wallet yet.</Text>
                    )}

                    {summary.list.map((lock) => (
                        <View key={lock.address} style={{ borderWidth: 1, borderColor: '#e5e5ea', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'black' }}>{amount(lock.balance)}</Text>
                            <Text style={{ color: lock.unlocked ? '#3f9b62' : '#c98a1b', fontWeight: 'bold', marginTop: 2 }}>
                                {lock.unlocked
                                    ? "Unlocked — redeem it in the web wallet"
                                    : "Locked — " + formatLockRemaining(lock.unlockTime - nowSec) + " left"}
                            </Text>
                            <Text style={{ color: '#555', fontSize: 12, marginTop: 2 }}>
                                {"Unlocks " + moment.unix(lock.unlockTime).format("DD MMM YYYY HH:mm")}
                            </Text>
                            <Text style={{ color: '#888', fontSize: 12 }}>
                                {lock.address.slice(0, 10) + "…" + lock.address.slice(-6)}
                            </Text>
                        </View>
                    ))}

                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: 'black', marginTop: 15 }}>Add a lock manually</Text>
                    <Text style={{ fontSize: 12, color: '#555', marginBottom: 5 }}>
                        Locks made from this wallet's seed are found automatically. If one is missing, enter its unlock time from the
                        web wallet: unix seconds, or YYYY-MM-DD HH:mm.
                    </Text>
                    <Input
                        placeholder="1790000000  or  2027-03-01 14:30"
                        value={lockInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                        renderErrorMessage={false}
                        containerStyle={{ paddingHorizontal: 0 }}
                        inputStyle={{ fontSize: 15, color: 'black' }}
                        onChangeText={(lockInput) => this.setState({ lockInput })}
                    />
                    <Button
                        title="Add lock"
                        loading={addingLock}
                        disabled={addingLock}
                        containerStyle={{ marginTop: 10 }}
                        buttonStyle={{ backgroundColor: '#202225' }}
                        onPress={this.addManualLock}
                    />
                    <Button
                        title="Close"
                        type="clear"
                        containerStyle={{ marginTop: 10 }}
                        titleStyle={{ color: '#202225' }}
                        onPress={() => this.setState({ showLocks: false })}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        );
    };

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

            const sats = await getWalletBalanceStrict(addresses, shouldDedupeBalance(this.props.wallet[timestamp]));
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

        this.refreshLocks();
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

            if (this.props.wallet[timestamp].isImported || shouldDedupeBalance(this.props.wallet[timestamp])) {
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

            if (this.props.wallet[timestamp].isImported || shouldDedupeBalance(this.props.wallet[timestamp])) {
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

        this.refreshLocks();
    };

    updateBalanceUSD = async (addresses, setWalletValues, timestamp) => {
        try {
            let totalBalance = 0;

            if (this.props.wallet[timestamp].isImported || shouldDedupeBalance(this.props.wallet[timestamp])) {
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
        const nowSec = this.state.nowSec;
        const lockSummary = summarizeLocks(this.props.wallet[timestamp].locks, nowSec);

        return (
            <View style={styles.flex}>
                <View style={styles.balanceContainer}>
                    <View style={{ width: "100%" }}>
                        {!isRefreshing ? (
                            <TouchableOpacity onPress={this.refreshHistory}>
                                {!lockSummary.hasLocks && (
                                <Text style={styles.balanceTitle}>
                                    {numberWithCommas(safeBalance.toFixed(8))} {Config.COIN_NAME}
                                </Text>
                                )}
                                {lockSummary.hasLocks && this.renderBalanceBreakdown(lockSummary, safeBalance, nowSec)}
                                {usdValue != null && !lockSummary.hasLocks && (
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

                        <TouchableOpacity
                            onPress={() => this.setState({ showLocks: true })}
                            style={{ alignSelf: 'center', marginTop: 8 }}
                        >
                            <Text style={{ color: 'white', opacity: 0.7, fontSize: 12, textDecorationLine: 'underline' }}>
                                {"Time locks"}
                            </Text>
                        </TouchableOpacity>
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
                {this.state.showLocks && this.renderLocksPanel(lockSummary, nowSec)}
            </View>
        );
    }
}

WalletScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(WalletScreen);
