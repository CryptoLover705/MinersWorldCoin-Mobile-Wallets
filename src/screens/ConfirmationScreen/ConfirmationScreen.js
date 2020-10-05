// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  View,
  Alert,
  Image,
} from 'react-native';
import {
  Text,
  Button,
  Divider,
} from 'react-native-elements';
import AppLink from 'react-native-app-link';
import { Navigation } from 'react-native-navigation';
import { responsiveHeight, responsiveWidth, responsiveFontSize } from 'react-native-responsive-dimensions';
import { connectWallet } from 'src/redux';
import { sendTransation, numberWithCommas } from 'src/utils/WalletUtils';
import { pushPasswordGate } from 'src/navigation';
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
      isLoading: false
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

  confirm = async () => {
    var { setWalletValues, amount, address, fee, from, timelock, timestamp } = this.props;
    const { addresses, receiveAddress } = this.props.wallet[timestamp];
    let tx;

    this.setState({isLoading: true});


    amount = Math.pow(10, 8) * amount;
    fee = Math.pow(10, 8) * fee;

    try {
      await global.socketConnect.connect();

      tx = await sendTransation(global.socketConnect, addresses, receiveAddress, address, amount, fee, timelock);
      console.log(tx);
    } catch (e) {
      tx = null;
      this.setState({isLoading: false});
    }

    this.setState({isLoading: false});

    if(tx !== undefined && !("error" in tx)) {
      Alert.alert(
          global.strings['send.title'],
          global.strings['send.successAlert'],
          [
            {
              text: global.strings['send.confirmAlertButton'],
              onPress: () => this.success(tx.tx),
            },
          ],
          {cancelable: false},
        );
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
            {global.strings["confirmation.balanceTooltipText"]} {numberWithCommas(balance.confirmed/Math.pow(10, 8).toFixed(8))} {Config.COIN_NAME}
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
              onPress={() => this.confirm()}
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
        </View>
    );
  }
}

ConfirmationScreen.propTypes = {
  wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(ConfirmationScreen);
