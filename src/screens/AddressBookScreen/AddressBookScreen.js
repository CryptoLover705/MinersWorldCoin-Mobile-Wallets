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
    Button,
    Input,
    Avatar
} from 'react-native-elements';
import Icon from 'react-native-vector-icons/FontAwesome';
import { SEND_SCREEN, ADD_ADDRESS_SCREEN, ADDRESS_INFO_SCREEN } from 'src/navigation';
import { Navigation } from 'react-native-navigation';
import { connectWallet } from 'src/redux';

const styles = StyleSheet.create({
    flex: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start'
    },
    basicContainer: {
        padding: 10,
        backgroundColor: 'white',
        alignSelf: 'center',
        justifyContent: 'flex-start',
        flexDirection: 'row',
        width: '100%',
        borderBottomColor: '#f0eff5',
        borderBottomWidth: 1
    },
    qrContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10
    },
    buttonsContainer: {
        flexDirection: 'row',
        alignSelf: 'center',
        justifyContent: 'center',
    },
    buttonIn: {
        backgroundColor: '#000773',
        borderRadius: 5,
        margin: 10,
    },
    buttonTitleIn: {
        fontSize: 14,
        fontWeight: 'bold'
    },
});

class AddressBookScreen extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            actionAddress: {index: 0, address: "", name: ""}
        }

        Navigation.events().bindComponent(this);
    }

    navigationButtonPressed({ buttonId }) {
        if (buttonId == "addAddress") {
            Navigation.showModal({
                stack: {
                    children: [{
                        component: {
                            name: ADD_ADDRESS_SCREEN,
                            passProps: {
                                    timestamp: this.props.timestamp,
                            },
                        }
                    }]
                }
            });
        }
    }

    processAddress = (addressItem) => {
        const { setWalletValues, timestamp } = this.props;
        this.setState({actionAddress: addressItem});

        Navigation.showModal({
                stack: {
                    children: [{
                    component: {
                        passProps: {
                            addressItem: addressItem,
                            timestamp: timestamp,
                            previousComponentId: this.props.componentId
                        },
                        name: ADDRESS_INFO_SCREEN,
                        options: {
                            topBar: {
                                largeTitle: {
                                    visible: false,
                                    fontSize: 30,
                                    color: 'white',
                                    fontFamily: 'HelveticaBold',
                                },

                            }
                        }
                    }
                }]
            }});
    }

    removeAddress = () => {
        const { setWalletValues, timestamp } = this.props;
        var { addressBook } = this.props.wallet[timestamp];
        const { actionAddress } = this.state;

        addressBook.splice(actionAddress.index, 1);
        setWalletValues({addressBook, timestamp: timestamp});

    }

    openSendScreen = () => {
        const { setWalletValues, timestamp } = this.props;
        const { actionAddress } = this.state;

        setWalletValues({cache: {sendAddress: actionAddress.address}, timestamp: timestamp});

        Navigation.mergeOptions(this.props.componentId, {
            bottomTabs: {
                currentTabIndex: 3,
            },
        });
    }

    render() {
        const { timestamp } = this.props;

        if (!(timestamp in this.props.wallet)) {
            return <View/>;
        }

        const { addressBook } = this.props.wallet[timestamp];
        const { actionAddress } = this.state;

        return (
            <View style={[styles.flex, , {alignSelf: 'center', width: '100%'}]}>
                {addressBook.length == 0 && <View style={{alignSelf: 'center', width: '100%', marginTop: 10, flex: 1, justifyContent: 'flex-end'}}>
                 <Text style={{textAlign: 'center', color: 'gray'}}>{global.strings['addressBook.empty']}</Text>
                </View>}
                <ScrollView style={{width: '100%'}}>
                    {
                        addressBook.map((addressItem, key) => (
                            <TouchableOpacity onPress={() => this.processAddress({...addressItem, index: key})} key={key}>
                                <AddressItem params={addressItem} />
                            </TouchableOpacity>
                        ))
                    }
                </ScrollView>
            </View>
        );
    }
}

class AddressItem extends PureComponent {
    render = () => {
        const { params } = this.props;
        var options = {
            foreground: [32, 34, 37, 255],      // rgba gray
            background: [240, 239, 245, 255],      // rgba black
        };

        return (
            <View style={styles.basicContainer}>
                <Avatar rounded title={params.name.substr(0,2)} size="medium" containerStyle={{marginRight: 10, backgroundColor: "black"}} />
                <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start'}}>
                    <Text style={{fontSize: 12, color: "black"}} numberOfLines={2}>
                        <Text style={{fontWeight: 'bold'}}>{params.address.substr(0, 7)}</Text><Text style={{opacity: 0.8}}>{params.address.substr(7, 12)}...{params.address.substr(-14, 14)}</Text><Text style={{fontWeight: 'bold'}}>{params.address.substr(-6, 6)}</Text>
                    </Text>
                    <Text style={{fontSize: 14, marginTop: 5}}>
                        {params.name}
                    </Text>
                </View>
            </View>
        );
    }
}

AddressBookScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(AddressBookScreen);
