'use strict'
const Client = require("./SocketUtils")

class SocketMethods extends Client {
    constructor(host) {
        super(host)
    }

    async get_info() {
        // API health check or general info
        return this.request('get_info')
    }

    async get_balance(address) {
        return this.request('get_balance', address)
    }

    async get_unspent(address) {
        return this.request('get_unspent', address)
    }

    async get_history(address) {
        return this.request('get_history', address)
    }

    async get_mempool(address) {
        return this.request('get_mempool', address)
    }

    async get_transaction(transaction) {
        return this.request('get_transaction', transaction)
    }

    async get_transaction_batch(transactions) {
        return this.request('get_transaction_batch', transactions)
    }

    async get_general_fee() {
        return this.request('get_general_fee')
    }

    async check_addresses(addresses) {
        return this.request('check_addresses', addresses)
    }

    async subscribe_blocks() {
        // HTTP-only → polling can replace later
        return true
    }

    async subscribe_address(address) {
        // HTTP-only → polling can replace later
        return true
    }

    async broadcast_transaction(transaction) {
        return this.request('broadcast_transaction', transaction)
    }
}

module.exports = SocketMethods