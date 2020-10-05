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
    Text,
    Button
} from 'react-native-elements';
import Icon from 'react-native-vector-icons/Entypo';
import { SETTINGS_SCREEN, CONFIRMATION_SCREEN, TRANSACTION_DETAILS_SCREEN, pushWalletList } from 'src/navigation';
import { Navigation } from 'react-native-navigation';
import { connectWallet } from 'src/redux';
import moment from "moment";
import { subscribeToAddresses, getTransactionHistory, getBalance, isAddress, generateAddresses, checkMempool, numberWithCommas } from 'src/utils/WalletUtils';
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
        paddingTop: -5,
        alignContent: 'space-between',
        justifyContent: 'space-between'
    },
    buttonsContainer: {
        flexDirection: 'row',
        alignContent: 'space-between',
    },
    buttonIn: {
        backgroundColor: 'white',
        borderRadius: 5,
    },
    buttonInTitle: {
        color: '#505659',
        fontSize: 14,
        fontWeight: 'bold'
    },
    buttonOut: {
        color: '#ef3b23',
        borderRadius: 25,
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
    }
});

class WalletScreen extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            mempool: {},
            isConnected: global.socketConnect.status(),
            appState: AppState.currentState,
            isRefreshing: false
        }

        Navigation.mergeOptions(this.props.componentId, {
            bottomTabs: {
                currentTabIndex: 2,
            }
        });

        Navigation.events().bindComponent(this);
    }

    componentDidMount() {
        AppState.addEventListener('change', this.handleAppStateChange);
        this.firstOpen();

        this.connectInterval = setInterval(() => {
            this.setState({isConnected: global.socketConnect.status()})
        }, 5000)

    }

    componentWillUnmount() {
        clearInterval(this.connectInterval);
        AppState.removeEventListener('change', this.handleAppStateChange);
    }

    startCheckingMempool = (address = null) => {
        const { timestamp } = this.props;
        const { addresses, transactions } = this.props.wallet[timestamp];

        if (!addresses) {
            const { receiveAddress } = this.props.wallet[timestamp];
            address = receiveAddress;
        }

        checkMempool(global.socketConnect, addresses, address, this.updateTransactionObjects)
    }

    updateTransactionObjects = (transactionObjects, needUpdate) => {
        const { updateWalletValues, setWalletValues, timestamp } = this.props;
        const { addresses, transactions } = this.props.wallet[timestamp];

        if (needUpdate) {
            this.refreshHistory();
            return;
        }

        updateWalletValues({transactions: transactionObjects, timestamp});
        getBalance({...transactions, ...transactionObjects}).then((balance) => {
            setWalletValues({balance, timestamp});
        })
    }

    handleAppStateChange = (nextAppState) => {
        if (this.state.appState.match(/background/) && nextAppState === 'active') {
            global.socketConnect.connect();
            pushWalletList();
        }
        this.setState({appState: nextAppState});
    }

    firstOpen = () => {
        const { updateWalletValues, setWalletValues, timestamp } = this.props;
        const { addresses, transactions, migrationData } = this.props.wallet[timestamp];

        this.startCheckingMempool();
        subscribeToAddresses(global.socketConnect, addresses, this.updateTransactionObjects);
        this.refreshHistory();

    }

    refreshHistory = async () => {
        const { updateWalletValues, setWalletValues, timestamp } = this.props;
        const { addresses, transactions } = this.props.wallet[timestamp];

        this.setState({isRefreshing: true});

        var newTransactions = await getTransactionHistory(global.socketConnect, addresses, transactions);

        if (Object.keys(newTransactions).length > 0) {
            updateWalletValues({transactions: newTransactions, timestamp: timestamp});
            var balance = await getBalance({...transactions, ...newTransactions});

            setWalletValues({balance, timestamp});
            this.setState({isRefreshing: false});
        } else {
            this.setState({isRefreshing: false});
        }
    }

    openTransactionDetails = (transaction, timestamp) => {
        Navigation.showModal({
            stack: {
                children: [{
                    component: {
                        name: TRANSACTION_DETAILS_SCREEN,
                        passProps: {
                            transaction: transaction,
                            timestamp: timestamp
                        },
                    }
                }]
            }
        });
    }

    transformToName = (address) => {
        const { timestamp } = this.props;
        const { addressBook } = this.props.wallet[timestamp];

        for (var i = 0; i < addressBook.length; i++) {
            if (addressBook[i].address == address) {
                return addressBook[i].name;
            }
        }

        return address;
    }

    renderTransaction = (transaction) => {
        return (<View style={{padding: 10,
                                        paddingTop: 15,
                                        paddingBottom: 15,
                                        backgroundColor: 'white',
                                        alignSelf: 'center',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: "100%",
                                        flexDirection: 'row',
                                         }}>
                    <Icon name={transaction.type ? 'circle-with-minus' : 'circle-with-plus'} type={'entypo'} size={25} style={[{marginRight: 10}, {color: "black"}]} />
                                            <View style={{justifyContent: "flex-start",
                                            alignItems: 'flex-start',
                                            flexDirection: 'column',
                                            flex: 1}}>
                    <View style={{flexDirection: 'row'}}>
                        <Text style={{alignSelf: 'center', fontSize: 16, fontWeight: '500', marginTop: 5}} numberOfLines={1}>
                            {(transaction.type ? "Sent" : "Received")}
                        </Text>
                        <Text style={[{textAlign: 'right', alignSelf: 'center', fontSize: 16, fontWeight: 'bold', flex: 1}, {color: transaction.type ? "#d3515e" : "#71b888"}]}>
                            {(transaction.type ? "-" : "+") + (numberWithCommas((transaction.amount/Math.pow(10, 8)).toFixed(8)))} {(Config.COIN_NAME)}
                        </Text>
                    </View>
                    <View style={{flexDirection: 'row'}}>
                        <Text style={{alignSelf: 'center', fontSize: 14, marginTop: 5, width: '60%'}} numberOfLines={1}>
                            {transaction.hash}
                        </Text>
                        <Text style={{textAlign: 'right', alignSelf: 'center', fontSize: 14, opacity: 0.8, color: 'black', flex: 1}}>
                            {moment.unix(transaction.time).format("DD MMM YYYY")}
                        </Text>
                    </View>
                </View>
            </View>);
    }

    numberWithCommas = (number) => {
            var parts = number.toString().split(".");
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

            return parts.join(".");
    }

    render() {
        const { timestamp } = this.props;

        if (!(timestamp in this.props.wallet)) {
            return <View/>;
        }

        const { balance, transactions } = this.props.wallet[timestamp];
        const { mempool, isConnected, isRefreshing } = this.state;

        return (
            <View style={styles.flex}>
                <View style={styles.balanceContainer}>
                    <View style={{flexDirection: 'column', width: "100%"}}>
                        {(!isRefreshing) ? <TouchableOpacity onPress={() => this.refreshHistory()}>
                            <Text style={styles.balanceTitle} adjustsFontSizeToFit minimumFontScale={.5} numberOfLines={1}>
                                {numberWithCommas((balance.confirmed/Math.pow(10, 8)).toFixed(8))} {Config.COIN_NAME}
                            </Text>

                        </TouchableOpacity> : <ActivityIndicator size="small" color="white" style={{margin: 5}} />}

                        <View style={{flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 10, marginBottom: 10}}>
                            <Text style={[styles.balanceSubtitle, {fontSize: 12, color: 'white'}]} numberOfLines={1}>
                                {global.strings['wallet.networkStatusTitle']}
                            </Text>
                            <Icon name={'controller-record'} type='entypo' size={15} style={{textAlign: 'center', marginLeft: 5, color: isConnected ? 'lightgreen' : 'red'}} />
                        </View>

                    </View>
                </View>
                {(Object.keys(transactions).length == 0) && <View style={{alignSelf: 'center', width: '90%', marginTop: 10, flex: 1, justifyContent: 'flex-end'}}>
                    <Text style={{textAlign: 'center', color: 'gray'}}>{ global.strings['wallet.empty'] } <Text style={{fontWeight: 'bold'}}>{ global.strings['wallet.emptyReceiveTab'] }</Text>.</Text>
                </View>}
                <ScrollView style={{width: '100%'}}>
                    {
                         Object.keys(transactions).sort().reverse().map((time) => (

                            <TouchableOpacity onPress={() => this.openTransactionDetails(transactions[time], timestamp)} key={time}>
                                {this.renderTransaction(transactions[time])}
                            </TouchableOpacity>

                        ))
                    }
                </ScrollView>
            </View>
        );
    }
}

WalletScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(WalletScreen);
