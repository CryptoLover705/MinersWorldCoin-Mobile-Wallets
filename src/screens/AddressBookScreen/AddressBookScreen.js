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
            actionAddress: {index: 0, address: "", name: ""},
            search: ""
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
        const { actionAddress, search } = this.state;

        // A-Z by name, filtered by the search box; keep each entry's original index
        const needle = search.trim().toLowerCase();
        const entries = addressBook
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => !needle ||
                (item.name || "").toLowerCase().includes(needle) ||
                (item.address || "").toLowerCase().includes(needle))
            .sort((a, b) => (a.item.name || "").toLowerCase().localeCompare((b.item.name || "").toLowerCase()));

        return (
            <View style={[styles.flex, , {alignSelf: 'center', width: '100%'}]}>
                {addressBook.length >= 5 && <Input
                    placeholder="Search name or address"
                    leftIcon={{ name: 'search', type: 'font-awesome', size: 14, color: 'gray' }}
                    containerStyle={{ width: '100%', paddingHorizontal: 10, marginTop: 10 }}
                    inputContainerStyle={{ borderBottomColor: '#f0eff5' }}
                    inputStyle={{ fontSize: 14 }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    renderErrorMessage={false}
                    onChangeText={(search) => this.setState({ search })}
                />}
                {addressBook.length > 0 && entries.length == 0 &&
                    <Text style={{textAlign: 'center', color: 'gray', marginTop: 20}}>No matching addresses</Text>
                }
                {addressBook.length == 0 && <View style={{alignSelf: 'center', width: '100%', marginTop: 10, flex: 1, justifyContent: 'flex-end'}}>
                 <Text style={{textAlign: 'center', color: 'gray'}}>{global.strings['addressBook.empty']}</Text>
                </View>}
                <ScrollView style={{width: '100%'}}>
                    {
                        entries.map(({ item: addressItem, index: key }) => (
                            <TouchableOpacity onPress={() => this.processAddress({...addressItem, index: key})} key={addressItem.address + key}>
                                <AddressItem params={addressItem} />
                            </TouchableOpacity>
                        ))
                    }
                </ScrollView>
            </View>
        );
    }
}

// Split an address for display as: start ... end. Every character is shown at most once
// (the old row printed the last 14 characters and then the last 6 again).
function splitAddress(address = "", head = 10, tail = 8) {
    if (address.length <= head + tail + 1) {
        return { head: address, tail: "" };
    }

    return { head: address.slice(0, head), tail: address.slice(-tail) };
}

class AddressItem extends PureComponent {
    render = () => {
        const { params } = this.props;
        const parts = splitAddress(params.address);

        return (
            <View style={[styles.basicContainer, {alignItems: 'center'}]}>
                <Avatar rounded title={(params.name || "?").substr(0,2).toUpperCase()} size="medium" containerStyle={{marginRight: 10, backgroundColor: "black"}} />
                <View style={{flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start'}}>
                    <Text style={{fontSize: 16, fontWeight: 'bold', color: "black"}} numberOfLines={1}>
                        {params.name}
                    </Text>
                    <Text style={{fontSize: 12, marginTop: 3, color: "#6b6b6b"}} numberOfLines={1}>
                        <Text style={{fontWeight: 'bold', color: "#202225"}}>{parts.head}</Text>
                        {parts.tail !== "" && <Text style={{color: "#8e8e93"}}>{" … "}</Text>}
                        {parts.tail !== "" && <Text style={{fontWeight: 'bold', color: "#202225"}}>{parts.tail}</Text>}
                    </Text>
                </View>
                <Icon name="angle-right" size={22} color="#c4c4c8" />
            </View>
        );
    }
}

AddressBookScreen.propTypes = {
    wallet: PropTypes.shape({}).isRequired
};

export default connectWallet()(AddressBookScreen);
