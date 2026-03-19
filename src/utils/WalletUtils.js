import bip39 from 'bip39';
import * as bip32 from 'bip32';
import HDKey from 'hdkey';
import moment from "moment";
import * as bitcoin from "bitcoinjs-lib";
import * as aes256 from "aes256";
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const hashType = bitcoin.Transaction.SIGHASH_ALL;
const mwc = {
	messagePrefix: '\x19MinersWorldCoin Signed Message:\n',
	bip32: {
	  public: 0x0488b21e,
  	  private: 0x0488ade4
	},
	bech32: 'mwc',
	pubKeyHash: parseInt(Config.PUB_KEY_HASH),
	scriptHash: parseInt(Config.SCRIPT_HASH),
	wif: parseInt(Config.WIF),
	dustThreshold: 0
}

export const ADDRESS_TYPES = {
  LEGACY: "legacy",
  SEGWIT: "segwit",
  BECH32: "bech32"
};

export async function getSelectedAddressType() {
  try {
    const type = await AsyncStorage.getItem("addressType");
    return type || ADDRESS_TYPES.BECH32;
  } catch (e) {
    return ADDRESS_TYPES.BECH32;
  }
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
	  bitcoin.address.fromBase58Check(address, mwc).hash,
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
  return bitcoin.payments.p2wpkh({ pubkey: publicKey, network: mwc });
}

function getP2SHScript(redeem) {
	return bitcoin.payments.p2sh({
		'redeem': redeem,
		'network': mwc
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

async function getAddress(node, network) {

  const type = await getSelectedAddressType();

  switch(type) {

    case ADDRESS_TYPES.LEGACY:
      return bitcoin.payments.p2pkh({
        pubkey: node.publicKey,
        network
      }).address;

    case ADDRESS_TYPES.SEGWIT:
      const redeem = bitcoin.payments.p2wpkh({
        pubkey: node.publicKey,
        network
      });

      return bitcoin.payments.p2sh({
        redeem,
        network
      }).address;

    case ADDRESS_TYPES.BECH32:
    default:
      return bitcoin.payments.p2wpkh({
        pubkey: node.publicKey,
        network
      }).address;
  }
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
		bitcoin.address.fromBase58Check(address, mwc)
		return true
	} catch (e) {
		try {
			bitcoin.address.fromBech32(address, mwc)
			return true
		} catch (e) {
			return false
		}
	}
}

export function importAddressByWIF(wif) {
	try {
		const keyPair = bitcoin.ECPair.fromWIF(wif, mwc);
		return getAddress(keyPair, mwc);
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

export async function generateAddresses(seedPhrase, derivePath = "m/44'/0'/0'/0", startIndex = 0, endIndex = 0) {
    const seed = bip39.mnemonicToSeed(seedPhrase);
	const root = bip32.fromSeed(seed, mwc);
    let addressList = {};
    let promises = [];

    for (var i = startIndex; i <= endIndex; i++) {
		const child = root.derivePath(derivePath + "/" + i.toString());
	    const address = await getAddress(child, mwc);
		addressList[address] = {index: i, privateKey: child.toWIF()};
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

export async function sendTransaction(socketConnect, walletAddresses, mainAddress, recieveAddress, amount, fee, timelock = 0) {

    let allUtxos = [];
    let keyMap = {};

    const txb = new bitcoin.TransactionBuilder(mwc);
    txb.setVersion(2);

    // 🔥 STEP 1: Collect ALL UTXOs
    for (let address in walletAddresses) {
        try {
            let utxos = await socketConnect.get_unspent(address);

            for (let utxo of utxos) {
                allUtxos.push({
                    ...utxo,
                    address
                });
            }

            keyMap[address] = bitcoin.ECPair.fromWIF(walletAddresses[address].privateKey, mwc);

        } catch (e) {
            console.log(e);
        }
    }

    if (allUtxos.length === 0) {
        return { error: "No UTXOs available" };
    }

    const target = parseInt(amount);

    let selection;

    // 🔥 STEP 2: Use proper UTXO selection
    try {
        selection = selectUTXOs(allUtxos, target, 1);
    } catch (e) {
        return { error: "Insufficient funds" };
    }

    const selected = selection.inputs;
    const total = selection.total;

    let keyPairs = [];
    let scripts = [];

    // 🔥 STEP 3: Add inputs
    for (let i = 0; i < selected.length; i++) {

        let utxo = selected[i];

        let script = new Buffer(utxo.script, 'hex');
        let type = getScriptType(script);

        let keyPair = keyMap[utxo.address];

        keyPairs.push(keyPair);

        if (type === 'bech32') {
            let p2wpkh = getP2WPKHScript(keyPair.publicKey);
            txb.addInput(utxo.txid, utxo.index, null, p2wpkh.output);
        } else {
            txb.addInput(utxo.txid, utxo.index);
        }

        scripts.push({
            script,
            type,
            value: parseInt(utxo.value),
        });
    }

    // 🔥 STEP 4: Outputs
    try {

        const change = total - target - selection.fee;

        if (change > 0) {
            if (!mainAddress) return { error: "Main address error" };

            // ⚠️ For now uses mainAddress (we can upgrade to change chain later)
            txb.addOutput(mainAddress, change);
        }

        txb.addOutput(recieveAddress, target);

    } catch (e) {
        return { error: e.message };
    }

    // 🔥 STEP 5: Sign inputs
    for (let i = 0; i < scripts.length; i++) {

        let value = scripts[i].value;

        switch (scripts[i].type) {

            case 'bech32':
                txb.sign(i, keyPairs[i], null, null, value, null);
                break;

            case 'segwit':
                let redeem = getP2WPKHScript(keyPairs[i].publicKey);
                let p2sh = getP2SHScript(redeem);

                txb.sign(i, keyPairs[i], p2sh.redeem.output, null, value, null);
                break;

            case 'legacy':
                txb.sign(i, keyPairs[i]);
                break;

            default:
                console.log("Unknown script type:", scripts[i].type);
                break;
        }
    }

    // 🔥 STEP 6: Build + broadcast
    try {
        let tx = txb.build().toHex();
        console.log("Transaction:", tx);

        let broadcast = await socketConnect.broadcast_transaction(tx);

        return { tx: broadcast };

    } catch (e) {
        console.log("Error:", e.message);
        return { error: e.message };
    }
}

export async function subscribeToAddresses(socketConnect, walletAddresses, callback, intervalMs = 5000) {

    let lastTxs = {};

    const poll = async () => {
        try {
            let allHistory = [];

            for (let address in walletAddresses) {
                const history = await socketConnect.get_history(address);
                allHistory.push(...history.tx);
            }

            const txObjects = await createTransactionsFromHistory(socketConnect, walletAddresses, allHistory);

            const newTxs = Object.keys(txObjects).filter(k => !(k in lastTxs));

            if (newTxs.length > 0) {
                lastTxs = { ...lastTxs, ...txObjects };
                callback(txObjects, true);
            }

        } catch (e) {
            console.log("Polling error:", e.message);
        }
    };

    poll();
    return setInterval(poll, intervalMs);
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

    await ensureSocketConnected(socketConnect);

    let balance = { confirmed: 0, unconfirmed: 0 };

    for (let time in transactions) {
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
        let lastMempool = [];

        const poll = async () => {
            try {
                const res = await socketConnect.get_mempool(address);
                const mempool = res.tx || [];

                if (JSON.stringify(mempool) !== JSON.stringify(lastMempool)) {

                    const mempoolObjects = await createTransactionsFromHistory(
                        socketConnect,
                        walletAddresses,
                        mempool
                    );

                    callback(mempoolObjects, true);
                    lastMempool = mempool;
                }

            } catch (e) {
                console.log("Mempool fetch error:", e.message);
            }
        };

        poll();
        return setInterval(poll, 3000);

    } catch (e) {
        console.log('mempool error: ', e);
    }
}

export const deriveGapLimitAddresses = async (
    seed,
    derivationPath,
    startIndex = 0,
    gapLimit = 20
) => {

    let addresses = {};

    const endIndex = startIndex + gapLimit;

    const generated = await generateAddresses(
        seed,
        derivationPath,
        startIndex,
        endIndex
    );

    Object.keys(generated).forEach(addr => {
        addresses[addr] = generated[addr];
    });

    return addresses;

};

export const selectUTXOs = (utxos, targetAmount, feePerByte = 1) => {

    // Sort smallest → largest (better for minimizing change)
    const sorted = utxos.sort((a, b) => a.value - b.value);

    let selected = [];
    let total = 0;

    for (let utxo of sorted) {
        selected.push(utxo);
        total += utxo.value;

        // rough fee estimate (can improve later)
        const estimatedFee = (selected.length * 148 + 2 * 34 + 10) * feePerByte;

        if (total >= targetAmount + estimatedFee) {
            return {
                inputs: selected,
                total,
                fee: estimatedFee
            };
        }
    }

    throw new Error("Insufficient funds");
};

export async function ensureSocketConnected(socketConnect) {
    if (!socketConnect) {
        throw new Error("API client not initialized");
    }
    return true;
}