'use strict'

import { findAddresses, generateAddresses, getBalance, getTransactionHistory } from 'src/utils/WalletUtils';
import io from 'socket.io-client';
var Promise = require('bluebird')

class Client {
    constructor(host){
        this.host = host;
        this.socket = io(host, {transports:['websocket'] });
        this.socket.emitAsync = Promise.promisify(this.socket.emit)
    }

    connect(){
        if (this.status()) {
            return Promise.resolve()
        }

        this.socket.open()
    }


    close(){
        if(this.socket.disconnected) {
            return
        }

        this.socket.close()
    }

    async request(method, params = null) {
        var tries = 0;

        if(this.socket.disconnected){
            while(tries < 5) {
                await new Promise(resolve => setTimeout(() => {
                    resolve();
                }, 1000));

                if (this.socket.connected) {
                    break;
                }

                tries++;
            }

            if(this.socket.disconnected) {
                return Promise.reject(new Error(method + ": disconnected"));
            }
        }

        try {
            if(params) {
                return this.socket.emitAsync(method, params).then((data) => {console.log(data)}).catch((data) => {
                    if(data.error) {
                        return Promise.reject(new Error(method + ": " + JSON.stringify(data.error)));
                    }

                    return data.result
                })
            }

            return this.socket.emitAsync(method).catch((data) => {
                if(data.error) {
                    return Promise.reject(new Error(data.error.message));
                }

                return data.result
            })
        }
        catch(error) {
            console.error("SocketError: ", error);
        }

    }

    status(){
        return this.socket.connected;
    }

}

module.exports = Client
