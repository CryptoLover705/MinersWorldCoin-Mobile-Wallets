'use strict'

import Config from 'react-native-config';
import axios from 'axios';
var Promise = require('bluebird');

class Client {
    constructor(host) {
        this.host = host || Config.API_URL; // https://api.minersworld.org
        this.isConnected = false;
    }

    // "Connect" just verifies API availability
    async connect() {
        try {
            const res = await axios.get(`${this.host}/ping`);
            if (res.status === 200) {
                this.isConnected = true;
                return Promise.resolve();
            } else {
                this.isConnected = false;
                return Promise.reject(new Error("API not reachable"));
            }
        } catch (e) {
            this.isConnected = false;
            return Promise.reject(new Error("API connect failed: " + e.message));
        }
    }

    // "Close" is a no-op for HTTP
    close() {
        this.isConnected = false;
    }

    // HTTP-based request wrapper
    async request(method, params = null) {
        if (!this.isConnected) {
            return Promise.reject(new Error(`${method}: disconnected`));
        }

        try {
            let res;
            switch (method) {
                case 'get_unspent':
                    res = await axios.get(`${this.host}/utxos/${params}`);
                    return res.data;
                case 'get_history':
                    res = await axios.get(`${this.host}/history/${params}`);
                    return res.data;
                case 'broadcast_transaction':
                    res = await axios.post(`${this.host}/broadcast`, { tx: params });
                    return res.data;
                case 'check_addresses':
                    res = await axios.post(`${this.host}/check_addresses`, { addresses: params });
                    return res.data;
                case 'get_mempool':
                    res = await axios.get(`${this.host}/mempool/${params}`);
                    return res.data;
                default:
                    return Promise.reject(new Error(`Unknown method: ${method}`));
            }
        } catch (e) {
            return Promise.reject(new Error(`${method} error: ${e.message}`));
        }
    }

    // Dummy functions to keep WalletUtils happy
    async subscribe_address(address) {
        // no-op for HTTP, polling will replace
        return true;
    }

    // Status property
    status() {
        return this.isConnected;
    }

    // Fake socket object to prevent WalletUtils from breaking
    socket = {
        on: (event, callback) => {
            // HTTP polling will be implemented in WalletUtils if needed
        }
    }
}

module.exports = Client;