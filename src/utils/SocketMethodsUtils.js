'use strict'
const Client = require("./SocketUtils")

class SocketMethods extends Client{
    constructor(host){
        super(host)
    }

    get_info(){
        return this.request('general.info')
    }

    get_balance(address){
        return this.request('address.balance', address)
    }

    get_unspent(address){
        return this.request('address.unspent', address)
    }

    get_history(address){
        return this.request('address.history', address)
    }

    get_mempool(address){
        return this.request('address.mempool.raw', address)
    }

    get_transaction(transaction){
        return this.request('transaction.info', transaction)
    }

    get_transaction_batch(transactions){
        return this.request('transaction.batch', transactions)
    }

    get_general_fee(){
        return this.request('general.fee')
    }

    check_addresses(addresses){
        return this.request('address.check', addresses)
    }

    subscribe_blocks(){
        return this.request('subscribe.blocks')
    }

    subscribe_address(address){
        return this.request('subscribe.address', address)
    }

    broadcast_transaction(transaction){
        return this.request('transaction.broadcast', transaction)
    }

}

module.exports = SocketMethods
