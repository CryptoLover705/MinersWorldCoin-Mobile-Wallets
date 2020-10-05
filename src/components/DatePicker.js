// @flow

import React, { PureComponent } from 'react';
import { View, ActivityIndicator, Platform,TouchableOpacity, Text, Modal, Animated, TouchableHighlight, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from "moment";

const SUPPORTED_ORIENTATIONS = ['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right'];
const DEFAULT_STATE = {
    isOpened: false,
    minimumDate: new Date(),
    currentMode: null,
    animatedHeight: new Animated.Value(259),
    IOSdate: new Date()
}

export default class DatePickerInput extends PureComponent {
    state = DEFAULT_STATE;

    componentDidMount() {
        const {mode} = this.props;

        this.setState({currentMode: mode});
    }

    onChangeAndroid = (event, date) => {
        this.setState({isOpened: false});

        const { currentMode, minimumDate } = this.state;
        const { onChange, mode } = this.props;

        if (event.type == "set") {
            if (currentMode == "date" && mode == "datetime") {
                this.setState({minimumDate: date, currentMode: "time", isOpened: true});
                return;
            }

            let minMomentDate = moment(minimumDate);
            onChange(moment(date).date(minMomentDate.date()).month(minMomentDate.month()).days(minMomentDate.days()));
        }

        this.setState(DEFAULT_STATE);
    }

    onChangeIOS = (event, date) => {
        this.setState({IOSdate: date});
    }

    setVisibleIOSModal = (visible) => {
        const {height, duration, onChange} = this.props;
        const {animatedHeight, IOSdate} = this.state;

        if (visible) {
            this.setState({isOpened: visible});
            return Animated.timing(
                animatedHeight,
                {
                    toValue: height,
                    duration: duration,
                    useNativeDriver: false
                }
            ).start();
        } else {
            return Animated.timing(
                animatedHeight,
                {
                    toValue: 0,
                    duration: duration,
                    useNativeDriver: false
                }
            ).start(() => {
                this.setState({isOpened: visible});
                onChange(moment(IOSdate));
            });
        }
    }

    render() {
        const {
            isOpened,
            minimumDate,
            currentMode,
            animatedHeight,
            IOSdate
        } = this.state;

        const {
            value,
            mode,
            inputStyle,
            containerStyle,
            format,
            is24Hour,
            locale,
            disabled
        } = this.props;

        return (
            <TouchableOpacity onPress={() => Platform.OS === 'android' ? this.setState({isOpened: true}) : this.setVisibleIOSModal(true)} style={[{padding: 10}, containerStyle]}>
                <Text style={[inputStyle, disabled && styles.disabled]}>
                    {moment(value).format(format)}
                </Text>
                {Platform.OS === 'android' && isOpened && <DateTimePicker
                    value={value}
                    mode={currentMode ? currentMode : mode}
                    minimumDate={minimumDate}
                    is24Hour={is24Hour}
                    locale={locale}
                    onChange={this.onChangeAndroid}
                />}
                {Platform.OS === 'ios' && <Modal
                    transparent={true}
                    animationType="none"
                    visible={isOpened}
                    supportedOrientations={SUPPORTED_ORIENTATIONS}
                    onRequestClose={() => this.setVisibleIOSModal(false)}
                >
                    <View
                      style={{flex: 1}}
                    >
                      <TouchableHighlight
                        style={[styles.datePickerMask]}
                        activeOpacity={1}
                        underlayColor={'#00000077'}
                        onPress={() => this.setVisibleIOSModal(false)}
                      >
                        <TouchableHighlight
                          underlayColor={'#fff'}
                          style={{flex: 1}}
                        >
                          <Animated.View
                            style={[styles.datePickerCon, {height: animatedHeight}]}
                          >
                            <View pointerEvents={'auto'} style={{backgroundColor: "white"}}>
                                <DateTimePicker
                                    value={IOSdate}
                                    mode={currentMode}
                                    minimumDate={minimumDate}
                                    is24Hour={is24Hour}
                                    locale={locale}
                                    onChange={this.onChangeIOS}
                                    style={[styles.datePicker]}
                                />
                            </View>
                            <TouchableHighlight
                              underlayColor={'transparent'}
                              onPress={() => this.setVisibleIOSModal(false)}
                              style={[styles.btnText, styles.btnCancel]}
                            >
                                <Text
                                    allowFontScaling={true}
                                    style={[styles.btnTextText, styles.btnTextCancel]}
                                >
                                    Cancel
                                </Text>
                            </TouchableHighlight>
                            <TouchableHighlight
                              underlayColor={'transparent'}
                              onPress={() => this.setVisibleIOSModal(false)}
                              style={[styles.btnText, styles.btnConfirm]}
                            >
                              <Text allowFontScaling={true}
                                    style={[styles.btnTextText]}
                              >
                                Confirm
                              </Text>
                            </TouchableHighlight>
                          </Animated.View>
                        </TouchableHighlight>
                      </TouchableHighlight>
                    </View>
                </Modal>}
            </TouchableOpacity>
        );
    }
}

const styles = StyleSheet.create({
    datePickerMask: {
        flex: 1,
        alignItems: 'flex-end',
        flexDirection: 'row',
        backgroundColor: '#00000077'
    },
    datePickerCon: {
        backgroundColor: '#fff',
        height: 0,
        overflow: 'hidden'
    },
    btnText: {
        position: 'absolute',
        top: 0,
        height: 42,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    btnTextText: {
        fontSize: 16,
        color: '#46cf98'
    },
    btnTextCancel: {
        color: '#666'
    },
    btnCancel: {
        left: 0
    },
    btnConfirm: {
        right: 0
    },
    datePicker: {
        marginTop: 42,
        borderTopColor: '#ccc',
        borderTopWidth: 1
    },
    disabled: {
        color: "#86939e"
    }
});

DatePickerInput.defaultProps = {
    height: 259,
    duration: 300,
};