// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    Alert,
    ScrollView,
    TouchableOpacity
} from 'react-native';
import {
    Text,
    Button,
    Divider,
    Input
} from 'react-native-elements';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Navigation } from 'react-native-navigation';
import RNPickerSelect, { defaultStyles } from 'react-native-picker-select';
// import DatePicker from 'react-native-datepicker';
import DatePickerInput from 'src/components/DatePicker';
import { connectWallet } from 'src/redux';
import { sendTransation, isAddress } from 'src/utils/WalletUtils';
import moment from "moment";
import { SCAN_SCREEN, CONFIRMATION_SCREEN, ADDRESS_LIST_SCREEN, pushPasswordGate } from 'src/navigation';

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
        width: "95%",
        flexDirection: 'column',
    },
    buttonIn: {
        backgroundColor: 'black',
        borderColor: '#6c82cf',
        borderWidth: 2,
        borderRadius: 20,
        marginTop: 10,
        alignSelf: 'center',
        width: "95%"
    },
    buttonTitleIn: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    buttonOut: {
        borderRadius: 25,
        borderColor: 'white',
        marginLeft: 5,
        marginRight: 5,
        marginBottom: 5,
    },
    buttonTitleOut: {
        borderRadius: 5,
        color: 'black',
        fontSize: 14,
        fontWeight: 'bold'
    },
});

class SendScreen extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            timelock: null,
            from: 0,
            to: "",
            amount: "",
            fee: 0.0001,
            isfeeUnlocked: false
        }

        this.modalDismissedListener = null;
        Navigation.events().bindComponent(this);
    }

    componentDidAppear() {
        this.setAddressFromCache();
    }

    componentDidMount() {
        global.socketConnect.get_general_fee().then((res) => {
            this.setState({fee: res.feerate/Math.pow(10, 8)})
        })

        this.modalDismissedListener = Navigation.events().registerModalDismissedListener(({ componentId, modalsDismissed }) => {
            this.setAddressFromCache();
        });
    }

    componentWillUnmount() {
        this.modalDismissedListener.remove();
    }

    setAddressFromCache = () => {
        const { setWalletValues, timestamp } = this.props;
        const { cache } = this.props.wallet[timestamp];

        if ("sendAddress" in cache) {
            this.setState({to: cache.sendAddress});
            setWalletValues({cache: {}, timestamp: timestamp});
        }
    }

    checkParams = async () => {
        const { timestamp } = this.props;
        var { from, to, amount, fee, timelock } = this.state;

        if (isNaN(fee)) {
            fee = parseFloat(fee.replace(",", "."));
        }

        if (isNaN(amount)) {
            amount = parseFloat(amount.replace(",", "."));
        }

        if (isAddress(to) && amount > 0 && fee > 0) {
            Navigation.showModal({
                stack: {
                    children: [{
                        component: {
                            name: CONFIRMATION_SCREEN,
                            passProps: {
                                amount: amount,
                                fee: fee,
                                address: to,
                                from: {},
                                timelock: moment(timelock).unix(),
                                timestamp: timestamp
                            },
                        }
                    }]
                }
            }).then(() => {
                Navigation.mergeOptions(this.props.componentId, {
                    bottomTabs: {
                        currentTabIndex: 2,
                    },
                });
            });

        } else {
            Alert.alert(global.strings['send.title'], global.strings['send.errorAlert']);
        }
    }

    clear = () => {
        this.setState({
            timelock: null,
            from: 0,
            to: "",
            amount: 0,
            fee: 0.,
            isfeeUnlocked: false
        })
    }

    openCamera = () => {
        const { timestamp } = this.props;

        Navigation.showModal({
            stack: {
                children: [{
                    component: {
                        passProps: {
                             timestamp: timestamp
                        },
                        name: SCAN_SCREEN,
                    }
                }]
            }
        });
    }

    openAddressList = () => {
        const { timestamp } = this.props;
        const { addressBook } = this.props.wallet[timestamp];

        if(addressBook.length == 0) {
                Alert.alert(
                    global.strings["transactionDetails.alertTitle"],
                    global.strings["transactionDetails.existNameAlert"],
                    [
                        {
                            text: global.strings["transactionDetails.confirmAlertButton"],
                        },
                    ],
                    {cancelable: false},
                );
        } else {
                Navigation.showModal({
                    stack: {
                        children: [{
                            component: {
                                passProps: {
                                     timestamp: timestamp
                                },
                                name: ADDRESS_LIST_SCREEN,
                            }
                        }]
                    }
                });
        }
    }

    render() {
        const { timestamp } = this.props;

        if (!(timestamp in this.props.wallet)) {
            return <View/>;
        }

        const { receiveAddress } = this.props.wallet[timestamp];
        const { to, amount, fee, timelock, show } = this.state;
        var fromList = [];

        return (
            <View style={styles.flex}>
                <ScrollView style={{width: '100%', flex: 1}}>
                    <View style={styles.basicContainer}>
                        <View style={{flexDirection: 'row', justifyContent: 'center', alignItems:'center'}}>
                            <Text style={{fontSize: 20, fontWeight: 'bold', color: 'black'}}>
                                {global.strings['send.transactionSubtitle']}
                            </Text>
                        </View>
                        <Divider style={{marginTop: 5, marginBottom: 5, backgroundColor: '#106860'}}/>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Text style={{fontSize: 14, fontWeight: 'bold', color: 'black'}}>
                                {global.strings['send.toText']}
                            </Text>
                            <Input
                                containerStyle={{flex: 1}}
                                inputContainerStyle={{borderColor: "white"}}
                                renderErrorMessage={false}
                                inputStyle={{fontSize: 14}}
                                placeholder={global.strings['send.addressExampleInput']}
                                onChangeText={(to) => this.setState({to})}
                                value={to}
                            />
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Button
                                    icon={{ name: "bookmark",
                                                    size: 14,
                                                    type: 'font-awesome',
                                                    color: "black" }}
                                    type="outline"
                                    title={global.strings['send.qrcodeButton']}
                                    containerStyle={{flex: 1, justifyContent: 'center'}}
                                    buttonStyle={styles.buttonOut}
                                    titleStyle={styles.buttonTitleOut}
                                    onPress={() => this.openCamera()}
                                />
                                <Button
                                        icon={{ name: "bookmark",
                                                        size: 14,
                                                        type: 'font-awesome',
                                                        color: "black" }}
                                        type="outline"
                                        title={global.strings['send.addressBookButton']}
                                        containerStyle={{flex: 1, justifyContent: 'center'}}
                                        buttonStyle={styles.buttonOut}
                                        titleStyle={styles.buttonTitleOut}
                                        onPress={() => this.openAddressList()}
                                    />
                        </View>
                        <Divider style={{marginLeft: -10, marginRight: -10, marginTop: 5, marginBottom: 5, backgroundColor: '#106860'}}/>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Text style={{fontSize: 14, fontWeight: 'bold', color: 'black'}}>
                                {global.strings['send.amountText']}
                            </Text>
                            <Input
                                keyboardType='numeric'
                                containerStyle={{flex: 1}}
                                inputContainerStyle={{borderColor: "white"}}
                                inputStyle={{fontSize: 14}}
                                placeholder='152.7653'
                                renderErrorMessage={false}
                                value={amount}
                                onChangeText={(amount) => this.setState({amount})}
                            />
                            <Text style={{fontSize: 14, fontWeight: 'bold', color: 'black'}}>
                                {global.strings['send.feeText']}
                            </Text>
                            <Input
                                keyboardType='numeric'
                                containerStyle={{flex: 1}}
                                inputContainerStyle={{borderColor: "white"}}
                                inputStyle={{fontSize: 14}}
                                placeholder='0.001'
                                renderErrorMessage={false}
                                value={fee.toString()}
                                editable={this.state.isfeeUnlocked}
                                onChangeText={(fee) => this.setState({fee})}
                            />
                            <TouchableOpacity onPress={() => this.setState({isfeeUnlocked: !this.state.isfeeUnlocked})}>
                                <Icon name={this.state.isfeeUnlocked ? 'unlock-alt' : 'lock'} size={25} style={{color: 'black'}} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Button
                        icon={{ name: "check-circle",
                                        size: 14,
                                        type: 'font-awesome',
                                        color: "white" }}

                        title={global.strings['send.confirmButton']}
                        containerStyle={{width: "100%", justifyContent: 'center'}}
                        buttonStyle={styles.buttonIn}
                        titleStyle={styles.buttonTitleIn}
                        onPress={() => this.checkParams()}
                    />
                    <Button
                            icon={{ name: "eraser",
                                            size: 14,
                                            type: 'font-awesome',
                                            color: "black" }}

                            title={global.strings["send.clearButton"]}
                            type='clear'
                            containerStyle={{width: "100%", justifyContent: 'center'}}
                            titleStyle={styles.buttonTitleOut}
                            onPress={() => this.clear()}
                        />
                </ScrollView>
            </View>
        );
    }
}

SendScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(SendScreen);
