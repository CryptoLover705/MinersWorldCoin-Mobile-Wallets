import bip39 from 'bip39';
import * as bip32 from 'bip32';
import HDKey from 'hdkey';
import moment from "moment";
import * as bitcoin from "bitcoinjs-lib";
import * as aes256 from "aes256";
import Config from 'react-native-config';
import AsyncStorage from '@react-native-community/async-storage';

const hashType = bitcoin.Transaction.SIGHASH_ALL;
const astc = {
	messagePrefix: '\x19AstraCore Signed Message:\n',
	bip32: {
	  public: 0x0488b21e,
  	  private: 0x0488ade4
	},
	bech32: 'astc',
	pubKeyHash: parseInt(Config.PUB_KEY_HASH),
	scriptHash: parseInt(Config.SCRIPT_HASH),
	wif: parseInt(Config.WIF),
	dustThreshold: 0
}

export function numberWithCommas(number) {
	var parts = number.toString().split(".");
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

	return parts.join(".");
}

export function encryptData(data, key) {
    if(key) {
        return aes256.encrypt(key, data);
    }

    return null;
}

export function decryptData(data, key) {
    if(key) {
        return aes256.decrypt(key, data);
    }

    return null;
}

export function decryptWallet(data, password) {
	let wallet = {};

	try {
		wallet.seedPhrase = decryptData(data.mnemonicPhrase, password).split(" ");
		wallet.title = data.title;
		wallet.addresses = {};

		for (address in data.addresses.internal) {
			wallet.addresses[address] = {index: 0, privateKey: decryptData(data.addresses.internal[address].privateKey, password)};
		}

		for (address in data.addresses.external) {
			wallet.addresses[address] = {index: 0, privateKey: decryptData(data.addresses.external[address].privateKey, password)};
		}

		wallet.receiveAddress = data.addresses.currentExternal;
		wallet.isCreated = true;
		wallet.isMigrated = true;
	} catch (e) {
		alert(e);
		return null;
	}

	return wallet;
}

export async function getMirgationWallets() {
  try {
    const wallets = await AsyncStorage.getItem('wallets');

    if(wallets !== null) {
    	AsyncStorage.setItem('wallets_backup', wallets);
      	return JSON.parse(wallets);
    }
  } catch(e) {
    return null;
  }

  return null;
}

export async function removeMirgationWallets() {
  try {
    await AsyncStorage.removeItem('wallets');
    return true;
  } catch(e) {
    return false;
  }

  return false;
}

function cltvOutput(address, lockTime) {
	return bitcoin.script.compile([
	  bitcoin.script.number.encode(lockTime),
	  bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
	  bitcoin.opcodes.OP_DROP,
	  bitcoin.opcodes.OP_DUP,
	  bitcoin.opcodes.OP_HASH160,
	  bitcoin.address.fromBase58Check(address, astc).hash,
	  bitcoin.opcodes.OP_EQUALVERIFY,
	  bitcoin.opcodes.OP_CHECKSIG
	])
}

function writeUInt64LE(buffer, value, offset) {
  buffer.writeInt32LE(value & -1, offset);
  buffer.writeUInt32LE(Math.floor(value / 0x100000000), offset + 4);
  return offset + 8;
}

function getP2WPKHScript(publicKey) {
  return bitcoin.payments.p2wpkh({ pubkey: publicKey, network: astc });
}

function getP2SHScript(redeem) {
	return bitcoin.payments.p2sh({
		'redeem': redeem,
		'network': astc
	})
}

function getScriptType(script) {
  var type = undefined

  if (script.includes(bitcoin.opcodes.OP_0) && script[1] == 20) {
	type = 'bech32'
  }

  if (script.includes(bitcoin.opcodes.OP_HASH160) && script[1] == 20) {
	type = 'segwit'
  }

  if (script.includes(bitcoin.opcodes.OP_DUP) && script.includes(bitcoin.opcodes.OP_HASH160) && script[2] == 20) {
	type = 'legacy'
  }

  return type
}

function getAddress(node, network) {
	return bitcoin.payments.p2wpkh({ pubkey: node.publicKey, network }).address;
}

function removeDuplicates(myArr, prop) {
    return myArr.filter((obj, pos, arr) => {
        return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos;
    });
}

export function validateMnemonic(mnemonic) {
    return bip39.validateMnemonic(mnemonic)
}

export function getSeed(mnemonic) {
    return bip39.mnemonicToSeed(mnemonic);
}

export function getHDKey(seed) {
    return HDKey.fromMasterSeed(seed);
}

export function isAddress(address) {
	try {
		bitcoin.address.fromBase58Check(address, astc)
		return true
	} catch (e) {
		try {
			bitcoin.address.fromBech32(address, astc)
			return true
		} catch (e) {
			return false
		}
	}
}

export function importAddressByWIF(wif) {
	try {
		const keyPair = bitcoin.ECPair.fromWIF(wif, astc);
		return getAddress(keyPair, astc);
	} catch (e) {
		return null;
	}
}

export function getLanguageInfo(code) {
	const isolangs = require('assets/isolangs.json');

	if (code in isolangs) {
		return isolangs[code];
	} else {
		return null;
	}
}

export function generateSeedPhrase(size = 12) {
	const mnemonic = require('assets/mnemonics.json');
	let seedPhrase = [];
	let randomNumbers = [];

	for (var i = 0; i < size; i++) {
	  while (true) {
	    let num = Math.floor(Math.random()*mnemonic.words.length);

	    if (!randomNumbers.includes(num)) {
	      randomNumbers.push(num);
	      seedPhrase.push(mnemonic.words[num]);
	      break;
	    }
	  }
	}

	return seedPhrase;
}

export function generateAddresses(seedPhrase, derivePath = "m/44'/0'/0'/0", startIndex = 0, endIndex = 0) {
    const seed = bip39.mnemonicToSeed(seedPhrase);
	const root = bip32.fromSeed(seed, astc);
    let addressList = {};
    let promises = [];

    for (var i = startIndex; i <= endIndex; i++) {
		const child = root.derivePath(derivePath + "/" + i.toString());
	    addressList[getAddress(child, astc)] = {index: i, privateKey: child.toWIF()};
    }

    return addressList;
}

export async function checkAddresses(socketConnect, addresses) {
    var addressList = {};

	var result = await socketConnect.check_addresses(Object.keys(addresses));
	console.log("socketConnect.check_addresses", result)

	if (Array.isArray(result)) {
		for(var i = 0; i < result.length; i++) {
			addressList[result[i]] = addresses[result[i]];
		}
	}

    return addressList;
}

export async function findAddresses(socketConnect, seedPhrase, derivePath) {
    let k = 0;
    let checkMore = true;
    let addressList = {};
    let findedAddressList = {};

    console.log("searching for addresses...")

    while (checkMore) {
        checkMore = false;

        console.log("generating...", 0+k, 19+k)
        addressList = await generateAddresses(seedPhrase, derivePath, 0+k, 19+k);
        console.log("searching...", 0+k, 19+k)
        addressList = await checkAddresses(socketConnect, addressList);

        if (Object.keys(addressList).length > 0) {
            k += 20;
            checkMore = true;
        }

        findedAddressList = {...findedAddressList, ...addressList};
    }

    // alert(JSON.stringify(findedAddressList))
    return findedAddressList;
}

export async function sendTransation(socketConnect, walletAddresses, mainAddress, recieveAddress, amount, fee, timelock = 0) {
	var outputsAmount = 0;
	var keyPairs = [];
	var scripts = [];
    const txb = new bitcoin.TransactionBuilder(astc)

    txb.setVersion(2);

	for (var address in walletAddresses) {
		var balance = null;

		try {
			balance = await socketConnect.get_balance(address);
		} catch (e) {
			console.log(e);
		}

		if (balance != null && (balance.balance > 0)) {
			try {
				let utxo = await socketConnect.get_unspent(address);

				for (var k = 0; k < utxo.length; k++) {

					if (parseInt(outputsAmount-amount-fee) > 0) {
						break;
					}

					var script = new Buffer(utxo[k].script, 'hex');
					var type = getScriptType(script);

					keyPairs.push(bitcoin.ECPair.fromWIF(walletAddresses[address].privateKey, astc));

					if (type == 'bech32') {
						var p2wpkh = getP2WPKHScript(keyPairs[k].publicKey)
						txb.addInput(utxo[k].txid, utxo[k].index, null, p2wpkh.output);
					} else {
						txb.addInput(utxo[k].txid, utxo[k].index);
					}

					outputsAmount += parseInt(utxo[k].value);

					scripts.push({
						'script': script,
						'type': type,
						'value': parseInt(utxo[k].value),
					});

				}
			} catch (e) {
				console.log(e);
			}
		}
	}

	if (outputsAmount < fee) {
		return {error: "Output amount error"};
	}

	try {
		if (outputsAmount-amount-fee > 0) {
			if (mainAddress != null) {
				txb.addOutput(mainAddress, parseInt(outputsAmount-amount-fee));
			} else {
				return {error: "Main address error"};
			}
		}

		txb.addOutput(recieveAddress, parseInt(amount));

	} catch (e) {
		return {error: e.message}
	}

	for (var i = 0; i < scripts.length; i++) {
		var value = scripts[i].value;

		switch (scripts[i].type) {
			case 'bech32':
				txb.sign(i, keyPairs[i], null, null, value, null);
				break

			case 'segwit':
				var redeem = getP2WPKHScript(keyPairs[i].publicKey);
				var p2sh = getP2SHScript(redeem);

				txb.sign(i, keyPairs[i], p2sh.redeem.output, null, value, null);
				break

			case 'legacy':
				txb.sign(i, keyPairs[i])
				break

			default:
				console.log("error in default: ", scripts[i].type);
				break
		}
	}

	try {
		var tx = txb.build().toHex()
		console.log("Transaction: ", tx)
		let broadcast = await socketConnect.broadcast_transaction(tx)

		console.log("Transaction error: ", broadcast);
		return {tx: broadcast};
	} catch (e) {
		console.log("Error: ", e.message);
		return {error: e.message}
	}

}

export async function subscribeToAddresses(socketConnect, walletAddresses, callback) {
	socketConnect.socket.on('address.update', (res) => {
		createTransactionsFromHistory(socketConnect, walletAddresses, res.result.tx).then((newMempoolObjects) => {
			console.log("newMempoolObjects", newMempoolObjects)
			callback(newMempoolObjects, false);
		})
	});

	for (var address in walletAddresses) {
		await socketConnect.subscribe_address(address);
	}
}

export async function createTransactionObject(socketConnect, walletAddresses, transactionVerbose) {
	let transaction = {};
	let isCoinbase = false;

	transaction.hash = transactionVerbose.txid;
	transaction.confirmations = transactionVerbose.confirmations;
	transaction.amount = 0;
	transaction.lock = {};
	transaction.time = transactionVerbose.time;
	transaction.fee = 0;
	transaction.type = 0;

	for (var k = 0; k < transactionVerbose.vin.length; k++) {
		if ("coinbase" in transactionVerbose.vin[k]) {
			transaction.from = "coinbase";
			isCoinbase = true;
			continue;
		}

		if (Object.keys(walletAddresses)
		      	 .includes(transactionVerbose.vin[k].scriptPubKey.addresses[0]) ) {

			transaction.amount += transactionVerbose.vin[k].value;
			transaction.type = 1;
			transaction.from = transactionVerbose.vin[k].scriptPubKey.addresses[0];
		}

		transaction.fee += (!isCoinbase) && transactionVerbose.vin[k].value;
	}

	if (transaction.amount == 0) {
		transaction.type = 0;

		for (var k = 0; k < transactionVerbose.vout.length; k++) {
			if (transactionVerbose.vout[k].scriptPubKey.type != "nonstandard") {
				if (Object
						.keys(walletAddresses)
						.includes(transactionVerbose.vout[k].scriptPubKey.addresses[0])) {

					transaction.amount += transactionVerbose.vout[k].value;
					transaction.to = transactionVerbose.vout[k].scriptPubKey.addresses[0];

					if (transactionVerbose.vout[k].scriptPubKey.type == "cltv") {
						transaction.lock[transactionVerbose.vout[k].scriptPubKey.asm.split(" ")[0]] = transactionVerbose.vout[k].value;
					}

				} else {
					if (!isCoinbase) {
						transaction.from = transactionVerbose.vout[k].scriptPubKey.addresses[0];
					}

				}

				transaction.fee -= (!isCoinbase) && transactionVerbose.vout[k].value;
			}

		}
	} else {
		for (var k = 0; k < transactionVerbose.vout.length; k++) {
			if (transactionVerbose.vout[k].scriptPubKey.type != "nonstandard") {
				if (Object
						.keys(walletAddresses)
						.includes(transactionVerbose.vout[k].scriptPubKey.addresses[0])) {

					transaction.amount -= transactionVerbose.vout[k].value;

					if (transactionVerbose.vout[k].scriptPubKey.type == "cltv") {
						transaction.lock[transactionVerbose.vout[k].scriptPubKey.asm.split(" ")[0]] = transactionVerbose.vout[k].value;
					}
				} else {
					transaction.to = transactionVerbose.vout[k].scriptPubKey.addresses[0];
				}

				transaction.fee -= (!isCoinbase) && transactionVerbose.vout[k].value;
			}

		}

		if (!("to" in transaction)) {
			transaction.to = transaction.from;
		}

		if (transaction.amount < 0) {
			transaction.type = 0;
			transaction.amount = transaction.amount * (-1)
		}

	}

	if (transactionVerbose.timestamp != null) {
		transaction.date = transactionVerbose.timestamp;
	} else {
		transaction.date = null;
	}

	return transaction;
}

async function createTransactionsFromHistory(socketConnect, walletAddresses, history) {
	var transactionHistory = {};
	var promises = [];

	if (history.length == 0) {
		return transactionHistory;
	}

	var transactions = await socketConnect.get_transaction_batch(history);

	for (var i = 0; i < transactions.length; i++) {
		promises.push(createTransactionObject(socketConnect, walletAddresses, transactions[i].result).then((transaction) => {

			if (transaction.time) {
				transactionHistory[transaction.time + transaction.hash] = transaction;
			}
		}));
	}

	await Promise.all(promises);
	return transactionHistory;
}

export async function getTransactionHistory(socketConnect, walletAddresses, transactions = null) {
	var allHistory = [];

	for (let address in walletAddresses) {
		await socketConnect.get_history(address).then((history) => {
			allHistory.push.apply(allHistory, history.tx);
		})
	}

	allHistory = allHistory.filter(function(item, pos) {
	    return allHistory.indexOf(item) == pos;
	});

	if (transactions != null) {
		for (var time in transactions) {
			for (var i = 0; i < allHistory.length; i++) {
				if (allHistory[i] == transactions[time].hash && transactions[time].confirmations > 6) {
					allHistory.splice(i, 1);
					break;
				}
			}
		}
	}

	return createTransactionsFromHistory(socketConnect, walletAddresses, allHistory);
}

export async function estimateFee () {
	return "0.00001";
}

export async function getBalance(transactions) {
   	let balance = {"confirmed": 0, "unconfirmed": 0};
   	let currentHeight = (await socketConnect.get_info()).blocks;

    for (time in transactions) {
		if (transactions[time].type) {
			balance.confirmed -= transactions[time].amount;
		} else {
			balance.confirmed += transactions[time].amount;
		}
    }

    balance.confirmed -= balance.unconfirmed;
    return balance;
}

export async function checkMempool(socketConnect, walletAddresses, address, callback) {
	try {
		var mempool = (await socketConnect.get_mempool(address)).tx;
		console.log("mempool array",mempool);
		var mempoolObjects = await createTransactionsFromHistory(socketConnect, walletAddresses, mempool);

		callback(mempoolObjects, false);

		var interval = setInterval(function() {
			socketConnect.get_mempool(address).then((newMempool) => {
				if (JSON.stringify(mempool) != JSON.stringify(newMempool.tx)) {
					createTransactionsFromHistory(socketConnect, walletAddresses, newMempool.tx).then((newMempoolObjects) => {
						callback(newMempoolObjects, true);
						mempool = newMempool.tx;
					})
				}

				if (newMempool.tx.length == 0) {
					clearInterval(interval);
				}
			});
		}, 2000);
	} catch (e) {
		console.log('mempool error: ', e)
		return;
	}

}
