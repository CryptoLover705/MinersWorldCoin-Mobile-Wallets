// @flow

import { Platform } from 'react-native';
import { Navigation } from 'react-native-navigation';
import Icon from 'react-native-vector-icons/FontAwesome5';

import {
    WALLET_LIST_SCREEN,
    RECEIVE_SCREEN,
    WALLET_SCREEN,
    SEND_SCREEN,
    SCAN_SCREEN,
    ADDRESS_BOOK_SCREEN,
    FIRST_WALLET_SCREEN,
    CREATE_WALLET_SCREEN,
    IMPORT_WALLET_SCREEN,
    PASSWORD_SCREEN,
    GENERATE_WALLET_SCREEN,
    SETTINGS_SCREEN,
    CONFIRMATION_SCREEN,
    TRANSACTION_DETAILS_SCREEN,
} from './Screens';
import registerScreens from './registerScreens';

// Register all screens on launch
registerScreens();

// async function prepareIcons() {
//   const icons = await Promise.all([
//     Icon.getImageSource('qrcode', 30),
//   ]);
//   const [qrcode] = icons;
//   return { qrcode };
// }

export function initialNav() {

    Navigation.setDefaultOptions({
        topBar: {
            background: {
                color: '#202225',
            },
            title: {
                color: 'white',
            },
            backButton: {
                title: '', // Remove previous screen name from back button
                color: 'white'
            },
            buttonColor: 'white',
        },
        statusBar: {
            style: 'light'
        },
        layout: {
            orientation: ['portrait'],
            backgroundColor: '#dee2e6'
        },
        bottomTabs: {
            backgroundColor: 'white',
            titleDisplayMode: 'alwaysShow',
        },
        bottomTab: {
            textColor: 'gray',
            selectedTextColor: 'black',
            iconColor: 'gray',
            selectedIconColor: 'black',
        }
    });

    pushWalletList()
    // pushStarterStack()
    // pushWalletStack()
}

export function pushStarterStack(type = 0) {
    Navigation.setRoot({
        root: {
            stack: {
                children: [{
                    component: {
                        passProps: {
                            type: type
                        },
                        name: FIRST_WALLET_SCREEN,
                        options: {
                            statusBar: {
                                style: 'light'
                            },
                            layout: {
                                backgroundColor: '#202225'
                            },
                            topBar: {
                                elevation: 0,
                                noBorder: true,
                                rightButtons: type == 1 ? [{
                                    id: 'dismiss',
                                    text: global.strings['firstWallet.cancelButton'],
                                    color: 'white'
                                }] : [],
                            }
                        },
                    }
                }]
            }
        }
    });
}

export function pushPasswordGate(type, timestamp, callback = null) {
    if (type == 1) {
        Navigation.setRoot({
            root: {
                stack: {
                    children: [{
                        component: {
                            passProps: {
                                type: type,
                                timestamp: timestamp
                            },
                            name: PASSWORD_SCREEN,
                        }
                    }]
                }
            }
        })
    } else if (type == 0) {
        Navigation.showModal({
            stack: {
                children: [{
                    component: {
                        name: PASSWORD_SCREEN,
                        passProps: {
                            type: type,
                            timestamp: timestamp
                        },
                    }
                }]
            }
        });
    } else if (type == 2) {
        Navigation.showModal({
            stack: {
                children: [{
                    component: {
                        name: PASSWORD_SCREEN,
                        passProps: {
                            type: type,
                            timestamp: timestamp,
                            callback: callback
                        },
                    }
                }]
            }
        });
    }
}

export function pushWalletList() {
        Navigation.setRoot({
            root: {
                stack: {
                    children: [{
                        component: {
                            passProps: {

                            },
                            name: WALLET_LIST_SCREEN,
                        }
                    }]
                }
            }
        })
}

export function pushWalletStack(timestamp) {
    // const icons = prepareIcons();

        Navigation.setRoot({
            root: {
                bottomTabs: {
                    id: 'walletTabStack',
                    children: [{
                        stack: {
                            id: ADDRESS_BOOK_SCREEN,
                            children: [{
                                component: {
                                    passProps: {
                                        timestamp: timestamp
                                    },
                                    name: ADDRESS_BOOK_SCREEN,
                                    options: {
                                        topBar: {
                                            rightButtons: [
                                                {
                                                    id: 'addAddress',
                                                    icon: require('assets/icons/ic_plus.png'),
                                                    color: 'white'
                                                }
                                            ],
                                            title: {
                                                text: global.strings['addressBook.title']
                                            },
                                            largeTitle: {
                                                visible: false,
                                                noBorder: true,
                                                fontSize: 30,
                                                fontFamily: 'HelveticaBold',
                                                color: 'white',
                                            }
                                        }
                                    }
                                }
                            }],
                            options: {
                                bottomTab: {
                                    icon: require('assets/icons/ic_book.png'),
                                    selectedIcon: require('assets/icons/ic_book.png'),
                                    testID: 'ADDRESS_BOOK_TAB_BAR_BUTTON',
                                    text: global.strings['addressBook.title'],
                                }
                            }
                        }
                    },
                    {
                        stack: {
                            id: RECEIVE_SCREEN,
                            children: [{
                                component: {
                                    passProps: {
                                         timestamp: timestamp
                                    },
                                    name: RECEIVE_SCREEN,
                                    options: {
                                        topBar: {
                                            title: {
                                                text: global.strings['receive.title']
                                            },
                                            largeTitle: {
                                                visible: false,
                                                fontSize: 30,
                                                color: 'white',
                                                fontFamily: 'HelveticaBold',
                                            }
                                        }
                                    }
                                }
                            }],
                            options: {
                                bottomTab: {
                                    icon: require('assets/icons/ic_swipe_down.png'),
                                    selectedIcon: require('assets/icons/ic_swipe_down.png'),
                                    testID: 'RECEIVE_TAB_BAR_BUTTON',
                                    text: global.strings['receive.title'],
                                }
                            }
                        }
                    },
                    {
                        stack: {
                            id: WALLET_SCREEN,
                            children: [{
                                component: {
                                    passProps: {
                                        timestamp: timestamp
                                    },
                                    name: WALLET_SCREEN,
                                    options: {
                                        topBar: {
                                            elevation: 0,
                                            noBorder: true,
                                            title: {
                                                text: global.strings['wallet.title']
                                            },
                                            largeTitle: {
                                                visible: false,
                                                noBorder: true,
                                                fontSize: 30,
                                                fontFamily: 'HelveticaBold',
                                                color: 'white',
                                            }
                                        }
                                    }
                                }
                            }],
                            options: {
                                bottomTab: {
                                    icon: require('assets/icons/ic_wallet.png'),
                                    selectedIcon: require('assets/icons/ic_wallet.png'),
                                    testID: 'WALLET_TAB_BAR_BUTTON',
                                    text: global.strings['wallet.title'],
                                }
                            }
                        }
                    },
                    {
                        stack: {
                            id: SEND_SCREEN,
                            children: [{
                                component: {
                                    passProps: {
                                        timestamp: timestamp
                                    },
                                    name: SEND_SCREEN,
                                    options: {
                                        topBar: {
                                            title: {
                                                text: global.strings['send.title']
                                            },
                                            largeTitle: {
                                                visible: false,
                                                noBorder: true,
                                                fontSize: 30,
                                                fontFamily: 'HelveticaBold',
                                                color: 'white',
                                            }
                                        }
                                    }
                                }
                            }],
                            options: {
                                bottomTab: {
                                    icon: require('assets/icons/ic_swipe_up.png'),
                                    selectedIcon: require('assets/icons/ic_swipe_up.png'),
                                    testID: 'SEND_TAB_BAR_BUTTON',
                                    text: global.strings['send.title'],
                                }
                            }
                        }
                    },
                    {
                        stack: {
                            id: SETTINGS_SCREEN,
                            children: [{
                                component: {
                                    passProps: {
                                        timestamp: timestamp
                                    },
                                    name: SETTINGS_SCREEN,
                                    options: {
                                        topBar: {
                                            title: {
                                                text: global.strings['settings.title']
                                            },
                                            largeTitle: {
                                                visible: false,
                                                noBorder: true,
                                                fontSize: 30,
                                                fontFamily: 'HelveticaBold',
                                                color: 'white',
                                            }
                                        }
                                    }
                                }
                            }],
                            options: {
                                bottomTab: {
                                    icon: require('assets/icons/ic_cog.png'),
                                    selectedIcon: require('assets/icons/ic_cog.png'),
                                    testID: 'SETTINGS_TAB_BAR_BUTTON',
                                    text: global.strings['settings.title'],
                                }
                            }
                        }
                    },
                    ],
                    options: {
                        currentTabId: WALLET_SCREEN
                    }
                }
            }
        });


}
