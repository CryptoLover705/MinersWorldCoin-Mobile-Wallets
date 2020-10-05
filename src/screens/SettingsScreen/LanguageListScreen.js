// @flow

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    Alert,
    ScrollView,
    Clipboard,
    Platform
} from 'react-native';
import {
    Text,
    Button,
    ListItem,
    Divider
} from 'react-native-elements';
import { Navigation } from 'react-native-navigation';
import { connectWallet } from 'src/redux';
import { initialNav } from 'src/navigation';
import { getLanguageInfo } from 'src/utils/WalletUtils';

const styles = StyleSheet.create({
    flex: {
        flex: 1
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
        backgroundColor: '#ef3b23',
        borderRadius: 25,
        margin: 10,
    },
    buttonOut: {
        borderRadius: 25,
        margin: 10,
    },
    buttonTitleIn: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    buttonTitleOut: {
        color: '#ef3b23',
        fontSize: 14,
        fontWeight: 'bold'
    },
    mnemonicButton: {
        borderColor: '#ef3b23',
        borderRadius: 25,
        padding: 3,
        paddingLeft: 6,
        paddingRight: 6,
    },
    mnemonicButtonContainer: {
        width: '30%',
        marginTop: 5,
        marginBottom: 5,
    },
    mnemonicButtonTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#ef3b23'
    },
});

class LanguageListScreen extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            languageCode: global.strings.getLanguage()
        }

        Navigation.mergeOptions(this.props.componentId, {
            topBar: {
                largeTitle: {
                    visible: false,
                    noBorder: true,
                    fontSize: 30,
                    fontFamily: 'HelveticaBold',
                    color: 'white',
                },
                title: {
                    text: global.strings['languageList.title']
                },
                rightButtons: [
                    {
                        color: 'white',
                        id: 'done',
                        text: global.strings["languageList.doneButton"]
                    }
                ],
                visible: true,
            }
        })

        Navigation.events().bindComponent(this);
    }

    navigationButtonPressed = ({ buttonId }) => {
        if (buttonId == 'done') {
            this.done();
        }
    }

    chooseLanguage = (languageCode) => {
        this.setState({languageCode})
    }

    done = () => {
        const { setDefaultValues, settingsComponentId, componentId } = this.props;
        const { languageCode } = this.state;

        setDefaultValues({defaultLanguage: languageCode});

        Navigation.dismissModal(componentId).then(() => {
            if (languageCode != global.strings.getLanguage()) {
                Navigation.dismissModal(settingsComponentId);
                initialNav();
            }
        })
    }

    render() {
        const { languageCode } = this.state;
        const languages = global.strings.getAvailableLanguages();
        var list = [];

        for (let i = 0; i < languages.length; i++) {
            list.push({language: getLanguageInfo(languages[i]), isChecked: languageCode == languages[i] ? true : false, onPress: () => this.chooseLanguage(languages[i])});
        }

        return (
            <View style={styles.flex}>
                <ScrollView>
                {
                    list.map((item, i) => (
                        <ListItem
                            onPress={item.onPress}
                            key={i}
                            title={item.language.name}
                            titleStyle={{color: 'black'}}
                            subtitle={item.language.nativeName}
                            subtitleStyle={{fontSize: 12, color: 'gray'}}
                            bottomDivider={true}
                            rightIcon={item.isChecked ? { name: 'check', type: 'font-owesome', size: 20 } : {}}
                        />
                    ))
                }
                </ScrollView>
            </View>
        );
    }
}

export default connectWallet()(LanguageListScreen);
