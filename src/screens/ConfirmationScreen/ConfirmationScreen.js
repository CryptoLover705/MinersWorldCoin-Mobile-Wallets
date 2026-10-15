// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  View,
  Alert,
  Image,
  Clipboard,
  Linking,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  Divider,
  Icon,
} from 'react-native-elements';
import AppLink from 'react-native-app-link';
import { Navigation } from 'react-native-navigation';
import { responsiveHeight, responsiveWidth, responsiveFontSize } from 'react-native-responsive-dimensions';
import { connectWallet } from 'src/redux';
import { sendTransaction, numberWithCommas, mergeTransactions, shortenMiddle, explorerTxUrl } from 'src/utils/WalletUtils';
import { pushPasswordGate, ADD_ADDRESS_SCREEN } from 'src/navigation';
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
    marginTop: 10,
  },
  buttonTitleIn: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  buttonOut: {
    color: '#000773',
    borderRadius: 25,
  },
  buttonTitleOut: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white'
  },
});

class ConfirmationScreen extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      sentResult: null,
      copiedTxid: false
    }

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
    })

    Navigation.events().bindComponent(this);
  }

  openUrl = async (url) => {
    const { app } = this.props;

    AppLink.maybeOpenURL(url, { appName: app});
  }

  success = (hash) => {
    const { app, amount, address, fee, timelock } = this.props;

    if (app) {
      let url = app + "://?txid=" + hash + "&amount=" + amount + "&fee=" + fee + "&address=" + address + "&timelock=" + timelock+ "&result=success";
      this.openUrl(url);
    }

    this.cancel();
  }

  error = () => {
    const { app, amount, address, fee, timelock } = this.props;

    if (app) {

      let url = app + "://?amount=" + amount + "&fee=" + fee + "&address=" + address + "&timelock=" + timelock+ "&result=error";
      this.openUrl(url);
    }

    this.cancel();
  }

  // Sending funds needs the PIN (or biometrics) first
  requirePin = () => {
    const { timestamp } = this.props;

    if (this.state.isLoading || this.sending) return;

    pushPasswordGate(3, timestamp, () => this.confirm());
  }

  // Put the transaction in the wallet right away as "Pending" (replaced by the real one on confirm)
  addPendingTransaction = (hash, amountSats, feeSats) => {
    try {
      const { updateWalletValues, address, timestamp } = this.props;
      const { receiveAddress, transactions } = this.props.wallet[timestamp];
      const now = Math.floor(Date.now() / 1000);

      const pending = {
        hash: hash,
        confirmations: 0,
        // same convention as confirmed sends: amount includes the fee
        amount: Math.round(amountSats + feeSats),
        fee: Math.round(feeSats),
        lock: {},
        time: now,
        date: null,
        type: 1,
        from: receiveAddress,
        to: address
      };

      updateWalletValues({
        transactions: mergeTransactions(transactions || {}, { [now + hash]: pending }),
        timestamp
      });
    } catch (e) {
      console.log("could not add pending transaction", e);
    }
  }

  confirm = async () => {
    var { setWalletValues, amount, address, fee, from, timelock, timestamp } = this.props;
    const { addresses, receiveAddress } = this.props.wallet[timestamp];
    let tx;

    // ignore double taps while a send is already in progress
    if (this.sending) return;
    this.sending = true;

    this.setState({isLoading: true});


    amount = Math.pow(10, 8) * amount;
    fee = Math.pow(10, 8) * fee;

    try {
      await global.socketConnect.connect();

      tx = await sendTransaction(global.socketConnect, addresses, receiveAddress, address, amount, fee, timelock);
      console.log(tx);
    } catch (e) {
      console.log(e);
      tx = { error: (e && e.message) ? e.message : "Could not send the transaction" };
    }

    this.sending = false;
    this.setState({isLoading: false});

    if (!tx || typeof tx !== 'object') {
      tx = { error: "No response from the network" };
    }

    if(!("error" in tx)) {
      // show it in the wallet straight away (amount/fee here are already in satoshis)
      this.addPendingTransaction(tx.tx, amount, fee);

      // tappable result card (see renderSentResult) instead of a plain Alert
      this.setState({ sentResult: { txid: tx.tx } });
    } else {
      Alert.alert(
          global.strings['send.title'],
          global.strings['send.errorAlert'] + " Error: " + tx.error,
          [
            {
              text: global.strings['send.confirmAlertButton'],
              onPress: () => this.error(),
            },
          ],
          {cancelable: false},
        );
    }
  }

  // ---- sent result card actions ----
  addToAddressBook = () => {
    const { address, timestamp } = this.props;

    Navigation.showModal({
      stack: {
        children: [{
          component: {
            name: ADD_ADDRESS_SCREEN,
            passProps: { address, timestamp },
          }
        }]
      }
    });
  }

  openExplorer = async () => {
    const { txid } = this.state.sentResult || {};

    if (!txid) return;

    const url = explorerTxUrl(txid);

    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Explorer", "Couldn't open the blockchain explorer.\n\n" + url);
    }
  }

  copyTxid = () => {
    const { txid } = this.state.sentResult || {};

    if (!txid) return;

    Clipboard.setString(txid);
    this.setState({ copiedTxid: true });
    setTimeout(() => this.setState({ copiedTxid: false }), 2000);
  }

  finish = () => {
    const { txid } = this.state.sentResult || {};

    this.success(txid);
  }

  renderSentResult = () => {
    const { address, amount, timestamp } = this.props;
    const { txid } = this.state.sentResult;

    const addressBook = (this.props.wallet[timestamp] && this.props.wallet[timestamp].addressBook) || [];
    const saved = addressBook.find((a) => a.address === address);

    const linkStyle = { color: '#6c82cf', fontWeight: 'bold', textDecorationLine: 'underline' };

    return (
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#202225', alignItems: 'center', justifyContent: 'center', padding: 20 }]}>
        <Icon name="check-circle" type="font-awesome" color="#71b888" size={64} />

        <Text style={{ fontSize: 22, fontWeight: 'bold', color: 'white', marginTop: 15 }}>
          {global.strings['send.title']}
        </Text>

        <Text style={{ fontSize: 15, color: 'white', opacity: 0.9, textAlign: 'center', marginTop: 15, lineHeight: 24 }}>
          {"Transaction for "}
          <Text style={{ fontWeight: 'bold' }}>{amount} {Config.COIN_NAME}</Text>
          {" has been sent to "}
          {saved
            ? <Text style={{ fontWeight: 'bold' }}>{saved.name} ({shortenMiddle(address, 6, 6)})</Text>
            : <Text style={linkStyle} onPress={this.addToAddressBook}>{shortenMiddle(address, 10, 8)}</Text>
          }
          {" with the txid of "}
          <Text style={linkStyle} onPress={this.openExplorer}>{shortenMiddle(txid, 8, 8)}</Text>
          {"."}
        </Text>

        <Text style={{ fontSize: 12, color: 'gray', textAlign: 'center', marginTop: 10 }}>
          {saved
            ? "This address is in your address book."
            : "Tap the address to save it to your address book."}
          {"  Tap the txid to view it on the explorer."}
        </Text>

        <View style={{ flexDirection: 'row', marginTop: 20 }}>
          <Button
            icon={{ name: this.state.copiedTxid ? "check" : "copy", size: 14, type: 'font-awesome', color: "white" }}
            title={this.state.copiedTxid ? "Copied" : (global.strings['send.copyTxidButton'] || "Copy TXID")}
            type="clear"
            titleStyle={styles.buttonTitleOut}
            onPress={this.copyTxid}
          />
          {!saved && <Button
            icon={{ name: "user-plus", size: 14, type: 'font-awesome', color: "white" }}
            title="Save address"
            type="clear"
            titleStyle={styles.buttonTitleOut}
            onPress={this.addToAddressBook}
          />}
        </View>

        <Button
          icon={{ name: "check-circle", size: 14, type: 'font-awesome', color: "white" }}
          title={global.strings['send.confirmAlertButton']}
          containerStyle={{ width: "90%", justifyContent: 'center', marginTop: 20 }}
          buttonStyle={styles.buttonIn}
          titleStyle={styles.buttonTitleIn}
          onPress={this.finish}
        />
      </View>
    );
  }

  cancel = async () => {
    Navigation.dismissModal(this.props.componentId);
  }

  render() {
    const { amount, address, fee, timelock, from, timestamp } = this.props;
    const { balance } = this.props.wallet[timestamp];

    console.log("balance: ", balance);

    return (
      <View style={[styles.flex, {justifyContent: 'flex-start', alignContent: 'center', flexDirection: 'column', backgroundColor: '#202225'}]}>
          <Image
            style={{width: responsiveWidth(20), height: responsiveHeight(12), resizeMode: 'center'}}
            source={require('assets/icons/logo-white.png')}
          />

          <Text style={{fontSize: 20, marginTop: 10, fontWeight: 'bold', color: 'white'}}>
            {global.strings["confirmation.title"]}
          </Text>
          <Text style={{fontSize: 14, color: "white", opacity: 0.9, textAlign: 'center', marginTop: 10, width: '85%'}}>
            {global.strings["confirmation.balanceTooltipText"]} {numberWithCommas(balance.confirmed.toFixed(8))} {Config.COIN_NAME}
          </Text>

          <View style={{flexDirection: "row", marginTop: 10, width: "90%", justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{fontSize: 14, color: "white", textAlign: 'left'}}>
              {global.strings["confirmation.amountTooltipText"]}
            </Text>
            <Text style={{fontSize: 14, fontWeight: "bold", color: "white", textAlign: 'right'}}>
              {amount} {Config.COIN_NAME}
            </Text>
          </View>

          <View style={{flexDirection: "row", marginTop: 10, width: "90%", justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{fontSize: 14, color: "white"}}>
              {global.strings["confirmation.addressTooltipText"]}
            </Text>
            <Text style={{fontSize: 12, fontWeight: "bold", color: "white", textAlign: 'right'}}>
              {address.substr(0, 12)}...{address.substr(-14, 14)}
            </Text>
          </View>

          <View style={{flexDirection: "row", marginTop: 10, width: "90%", justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{fontSize: 14, color: "white", textAlign: 'left'}}>
              {global.strings["confirmation.feeTooltipText"]}
            </Text>
            <Text style={{fontSize: 14, fontWeight: "bold", color: "white", textAlign: 'right'}}>
              {fee} {Config.COIN_NAME}
            </Text>
          </View>

          <View style={{position: "absolute", bottom: 10, left: 0, right: 0, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{fontSize: 14, fontWeight: 'bold', color: 'white', opacity: 0.9, textAlign: 'center', width: '90%'}}>
              {global.strings["confirmation.subtitle"]}
            </Text>

            <Button
              icon={{ name: "check-circle",
                      size: 14,
                      type: 'font-awesome',
                      color: "white" }}

              title={global.strings["confirmation.confirmButton"]}
              containerStyle={{width: "90%", justifyContent: 'center'}}
              buttonStyle={styles.buttonIn}
              titleStyle={styles.buttonTitleIn}
              onPress={() => this.requirePin()}
              loading={this.state.isLoading}
            />
            <Button
              icon={{ name: "times",
                      size: 14,
                      type: 'font-awesome',
                      color: "white" }}

              title={global.strings["confirmation.cancelButton"]}
              type='clear'
              containerStyle={{width: "90%", marginTop: 10, marginBottom: 10, justifyContent: 'center'}}
              titleStyle={styles.buttonTitleOut}
              onPress={() => this.cancel()}
            />
          </View>
          {this.state.sentResult && this.renderSentResult()}
        </View>
    );
  }
}

ConfirmationScreen.propTypes = {
  wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(ConfirmationScreen);
