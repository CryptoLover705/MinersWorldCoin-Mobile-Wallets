// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    Alert,
    Image,
    Linking
} from 'react-native';
import {
    Text,
    Button,
    Divider,
} from 'react-native-elements';
import { Navigation } from 'react-native-navigation';
import { responsiveHeight, responsiveWidth, responsiveFontSize } from 'react-native-responsive-dimensions';
import { connectWallet } from 'src/redux';
import { sendTransation, numberWithCommas } from 'src/utils/WalletUtils';
import { ADD_ADDRESS_SCREEN } from 'src/navigation';
import Config from 'react-native-config';
import moment from "moment";

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
        color: 'white',
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
        fontWeight: 'bold',
    },
    buttonOut: {
        color: '#ef3b23',
        borderRadius: 25,
    },
    buttonTitleOut: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'white',
    },
});

class TransactionDetailsScreen extends PureComponent {

    constructor(props) {
        super(props);

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
        });

        Navigation.events().bindComponent(this);
    }

    addAddress = async (address) => {
        const { timestamp } = this.props;

        Navigation.showModal({
                stack: {
                    children: [{
                        component: {
                            name: ADD_ADDRESS_SCREEN,
                            passProps: {
                                address: address,
                                timestamp: timestamp
                            },
                        }
                    }]
                }
            });
    }

    explorer = async () => {
        const { hash } = this.props.transaction;

        let url = Config.EXPLORER_URL + "/#/transaction/" + hash;

        Linking.canOpenURL(url).then(supported => {

            if (supported) {
                Linking.openURL(url);
            } else {
                console.log("Don't know how to open URI: " + url);
            }

        });
    }

    close = async () => {
        Navigation.dismissModal(this.props.componentId);
    }

    transformToName = (address) => {
        const { timestamp } = this.props;
        const { addressBook, addresses } = this.props.wallet[timestamp];

        for (var i = 0; i < addressBook.length; i++) {
            if (addressBook[i].address == address) {
                return addressBook[i].name;
            }
        }

        if (address == "coinbase") {
            return null;
        }

        if (address in addresses) {
            return global.strings['transactionDetails.myWalletText'];
        }

        return address;
    }

    render() {
        const { transaction } = this.props;
        // transaction.confirmations = getCurrentHeight() - transactions.height;

        return (
            <View style={[styles.flex, {justifyContent: 'flex-start', alignContent: 'center', flexDirection: 'column', backgroundColor: '#202225'}]}>
                    <Image
                        style={{width: responsiveWidth(20), height: responsiveHeight(12), resizeMode: 'contain'}}
                        source={require('assets/icons/logo.png')}
                    />

                    <Text style={{fontSize: 20, marginTop: 10, fontWeight: "bold", color: 'white'}}>
                        {global.strings['transactionDetails.title']}
                    </Text>

                    <Text style={{fontSize: 20, fontWeight: "bold", color: transaction.type ? "#f22f0c" : "#32a852", textAlign: 'center', width: '90%'}}>
                        {transaction.type ? global.strings['transactionDetails.sendText'] : global.strings['transactionDetails.receivedText']}
                    </Text>

                    <View style={{flexDirection: "row", marginTop: 10, width: "90%", justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <Text style={{fontSize: 14, marginRight: 30, color: 'white'}}>
                            {global.strings['transactionDetails.dateTooltipText']}
                        </Text>
                        <Text style={{fontSize: 14, color: "white", fontWeight: "bold", textAlign: "right"}}>
                            {moment.unix(transaction.time).format("YYYY-MM-DD HH:mm:ss")}
                        </Text>
                    </View>

                    <View style={{flexDirection: "row", marginTop: 10, width: "90%", justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <Text style={{fontSize: 14, marginRight: 20, color: "white"}}>
                            {global.strings['transactionDetails.confirmationsTooltipText']}
                        </Text>
                        <Text style={{fontSize: 14, color: "white", fontWeight: "bold", textAlign: "right"}}>
                            {transaction.confirmations ? transaction.confirmations : 0}
                        </Text>
                    </View>

                    <View style={{flexDirection: "row", marginTop: 10, width: "90%", justifyContent: 'space-between', alignItems: 'center'}}>
                        <Text style={{fontSize: 14, marginRight: 30, color: "white"}}>
                            {global.strings['transactionDetails.txidTooltipText']}
                        </Text>
                        <Text style={{fontSize: 14, flex: 1, color: "white", fontWeight: "bold", textAlign: "right"}}>
                            {transaction.hash}
                        </Text>
                    </View>

                    <View style={{flexDirection: "row", marginTop: 10, width: "90%", justifyContent: 'space-between', alignItems: 'center'}}>
                        <Text style={{fontSize: 14, marginRight: 30, color: "white"}}>
                            {global.strings['transactionDetails.fromTooltipText']}
                        </Text>
                        <View style={{flexDirection: "column", flex: 1, justifyContent: "flex-start"}}>
                            {this.transformToName(transaction.from) == transaction.from ? <Button
                                    icon={{ name: "plus",
                                                    size: 12,
                                                    type: 'font-awesome',
                                                    color: "white" }}

                                    title={transaction.from}
                                    buttonStyle={[styles.buttonIn]}
                                    titleProps={{numberOfLines: 1}}
                                    titleStyle={[styles.buttonTitleIn, {fontSize: 10}]}
                                    onPress={() => this.addAddress(transaction.from)}
                                /> : (this.transformToName(transaction.from) == null ? <Text style={{fontSize: 14, flex: 1, color: "black", fontWeight: "bold", textAlign: "right"}}>{transaction.from}</Text> : <View>
                                    <Text style={{fontSize: 14, color: "white", fontWeight: "bold", textAlign: "right"}}>
                                        {this.transformToName(transaction.from)}
                                    </Text>
                                    <Text style={{fontSize: 12, color: "white", textAlign: "right"}}>
                                        {transaction.from}
                                    </Text>
                                </View>)}
                        </View>
                    </View>

                    <View style={{flexDirection: "row", marginTop: 10, width: "90%", justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <Text style={{fontSize: 14, marginRight: 30, color: "white"}}>
                            {global.strings['transactionDetails.toTooltipText']}
                        </Text>
                        <View style={{flexDirection: "column", flex: 1, justifyContent: "flex-end"}}>
                            {this.transformToName(transaction.to) == transaction.to ? <Button
                                    icon={{ name: "plus",
                                                    size: 12,
                                                    type: 'font-awesome',
                                                    color: "white" }}

                                    title={transaction.to}
                                    buttonStyle={[styles.buttonIn]}
                                    titleStyle={[styles.buttonTitleIn, {fontSize: 10}]}
                                    titleProps={{numberOfLines: 1}}
                                    onPress={() => this.addAddress(transaction.to)}
                                /> : <View>
                                    <Text style={{fontSize: 14, color: "white", fontWeight: "bold", textAlign: "right"}}>
                                        {this.transformToName(transaction.to)}
                                    </Text>
                                    <Text style={{fontSize: 12, color: "white", textAlign: "right"}}>
                                        {transaction.to.substr(0, 12)}...{transaction.to.substr(-20, 20)}
                                    </Text>
                                </View>}
                        </View>
                    </View>

                    <View style={{flexDirection: "row", marginTop: 10, width: "90%", justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <Text style={{fontSize: 14, marginRight: 30, color: "white"}}>
                            {global.strings['transactionDetails.amountText']}
                        </Text>
                        <Text style={{fontSize: 14, flex: 1, color: "white", fontWeight: "bold", textAlign: "right"}}>
                            {numberWithCommas((transaction.amount / Math.pow(10, 8)).toFixed(8))} {(Config.COIN_NAME)}
                        </Text>
                    </View>

                    <View style={{flexDirection: "row", marginTop: 10, width: "90%", justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <Text style={{fontSize: 14, marginRight: 30, color: "white"}}>
                            {global.strings['transactionDetails.feeText']}
                        </Text>
                        <Text style={{fontSize: 14, flex: 1, color: "white", fontWeight: "bold", textAlign: "right"}}>
                            {numberWithCommas((transaction.fee / Math.pow(10, 8)).toFixed(8))} {Config.COIN_NAME}
                        </Text>
                    </View>

                    <View style={{position: "absolute", bottom: 10, left: 0, right: 0, justifyContent: 'center', alignItems: 'center'}}>
                        <Button
                            icon={{ name: "check-circle",
                                            size: 14,
                                            type: 'font-awesome',
                                            color: "white" }}

                            title={global.strings['transactionDetails.explorerButton']}
                            containerStyle={{width: "90%", justifyContent: 'center'}}
                            buttonStyle={styles.buttonIn}
                            titleStyle={styles.buttonTitleIn}
                            onPress={() => this.explorer()}
                        />
                        <Button
                            icon={{ name: "times",
                                            size: 14,
                                            type: 'font-awesome',
                                            color: "white" }}

                            title={global.strings['transactionDetails.closeButton']}
                            type='clear'
                            containerStyle={{width: "90%", marginBottom: 10, justifyContent: 'center'}}
                            titleStyle={styles.buttonTitleOut}
                            onPress={() => this.close()}
                        />
                    </View>
                </View>
        );
    }
}

TransactionDetailsScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(TransactionDetailsScreen);
