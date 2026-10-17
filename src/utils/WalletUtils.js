import bip39 from 'bip39';
import * as bip32 from 'bip32';
import HDKey from 'hdkey';
import moment from "moment";
import * as bitcoin from "bitcoinjs-lib";
import * as aes256 from "aes256";
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "axios";
import qs from 'qs';

export const ADDRESS_TYPES = {
    LEGACY: 'legacy',
    SEGWIT: 'segwit',
    BECH32: 'bech32'
};
const API = "https://api.minersworld.org";

const hashType = bitcoin.Transaction.SIGHASH_ALL;
const mwc = {
	messagePrefix: '\x19MinersWorldCoin Signed Message:\n',
	bip32: {
	  public: 0x0488b21e,
  	  private: 0x0488ade4
	},
	bech32: 'mwc',
	pubKeyHash:  20,  //parseInt(Config.PUB_KEY_HASH),
	scriptHash: 10, //parseInt(Config.SCRIPT_HASH),
	wif: 123, //parseInt(Config.WIF),
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
    if (!script) return undefined;

    if (script[0] === bitcoin.opcodes.OP_0 && script[1] === 20) {
        return 'bech32';
    }

    if (script[0] === bitcoin.opcodes.OP_HASH160 && script[1] === 20) {
        return 'segwit';
    }

    if (
        script[0] === bitcoin.opcodes.OP_DUP &&
        script[1] === bitcoin.opcodes.OP_HASH160 &&
        script[2] === 20
    ) {
        return 'legacy';
    }

    return undefined;
}

function getAddress(node, network, type = ADDRESS_TYPES.BECH32) {
    switch (type) {
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

export function isValidWIF(wif) {
    try {
        bitcoin.ECPair.fromWIF(wif, mwc);
        return true;
    } catch (e) {
        return false;
    }
}

export function importAddressByWIF(wif) {
    try {
        const keyPair = bitcoin.ECPair.fromWIF(wif, mwc);
        const pubkey = keyPair.publicKey;

        const legacy = bitcoin.payments.p2pkh({
            pubkey,
            network: mwc
        }).address;

        const bech32 = bitcoin.payments.p2wpkh({
            pubkey,
            network: mwc
        }).address;

        const segwit = bitcoin.payments.p2sh({
            redeem: bitcoin.payments.p2wpkh({
                pubkey,
                network: mwc
            }),
            network: mwc
        }).address;

        console.log("WIF IMPORT DEBUG:", {
            legacy,
            segwit,
            bech32
        });

        return { legacy, segwit, bech32 };

    } catch (e) {
        console.log("WIF import error:", e);
        return null;
    }
}

// Builds an address list (same shape as generateAddresses) from a single WIF key.
// bech32 is first so it becomes the default receive address, like seed wallets.
export function generateAddressesFromWIF(wif) {
    const derived = importAddressByWIF(wif);
    if (!derived) return {};

    const list = {};
    if (derived.bech32) list[derived.bech32] = { index: 0, privateKey: wif, type: ADDRESS_TYPES.BECH32 };
    if (derived.segwit) list[derived.segwit] = { index: 0, privateKey: wif, type: ADDRESS_TYPES.SEGWIT };
    if (derived.legacy) list[derived.legacy] = { index: 0, privateKey: wif, type: ADDRESS_TYPES.LEGACY };

    return list;
}

export function deriveAddressFromWIF(wif, type = ADDRESS_TYPES.LEGACY) {
    if (!isValidWIF(wif)) return null;

    return importAddressByWIF(wif, type);
}

export function getLanguageInfo(code) {
	const isolangs = require('assets/isolangs.json');

	if (code in isolangs) {
		return isolangs[code];
	} else {
		return null;
	}
}

// Generates a standard BIP39 mnemonic (12 or 24 words) using a cryptographically
// secure RNG (react-native-get-random-values is loaded first in index.js).
// Includes the BIP39 checksum, so the phrase works in any BIP39 wallet.
export function generateSeedPhrase(size = 12) {
    if (size !== 12 && size !== 24) {
        throw new Error("Seed phrase size must be 12 or 24 words");
    }

    const mnemonic = bip39.generateMnemonic(size === 24 ? 256 : 128);

    // Never hand out a seed we can't validate (e.g. if the RNG were broken)
    if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error("Failed to generate a valid seed phrase");
    }

    return mnemonic.split(" ");
}

export function generateAddresses(
    seedPhrase,
    derivePath = "m/44'/0'/0'/0",
    startIndex = 0,
    endIndex = 0,
    type = ADDRESS_TYPES.BECH32
) {
    const seed = bip39.mnemonicToSeed(seedPhrase);
    const root = bip32.fromSeed(seed, mwc);

    let addressList = {};

    for (let i = startIndex; i <= endIndex; i++) {
        const child = root.derivePath(derivePath + "/" + i.toString());

        const address = getAddress(child, mwc, type);

        addressList[address] = {
            index: i,
            privateKey: child.toWIF(),
            type // ✅ keep this
        };
    }

    return addressList; // ✅ IMPORTANT: keep original structure
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

// True if the address has ever been used (any tx history). Throws on network failure
// so a flaky connection can't silently look like "no funds".
async function addressIsUsed(address) {
    let lastError;

    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const res = await axios.get(`${API}/history/${address}`);
            const tx = res?.data?.result?.tx;
            return Array.isArray(tx) && tx.length > 0;
        } catch (e) {
            lastError = e;
        }
    }

    throw lastError;
}

// Scans one derivation chain/type in batches of 20 until a whole batch is unused.
export async function findAddressesREST(seedPhrase, derivePath, type = ADDRESS_TYPES.BECH32) {
    const MAX_BATCHES = 15; // hard stop at 300 addresses per chain/type
    let found = {};
    let k = 0;

    for (let batch = 0; batch < MAX_BATCHES; batch++) {
        const candidates = generateAddresses(seedPhrase, derivePath, k, k + 19, type);
        const addrs = Object.keys(candidates);

        const used = await Promise.all(addrs.map(addressIsUsed));

        let anyUsed = false;
        addrs.forEach((addr, i) => {
            if (used[i]) {
                found[addr] = candidates[addr];
                anyUsed = true;
            }
        });

        if (!anyUsed) break;
        k += 20;
    }

    return found;
}

// Finds every used address for a seed: external + change chains, all address types.
export async function discoverSeedAddresses(seedPhrase, basePath) {
    let all = {};

    for (const chain of ["0", "1"]) {
        for (const type of [ADDRESS_TYPES.BECH32, ADDRESS_TYPES.SEGWIT, ADDRESS_TYPES.LEGACY]) {
            const found = await findAddressesREST(seedPhrase, basePath + chain, type);
            all = { ...all, ...found };
        }
    }

    return all;
}

export async function sendTransaction(
    socketConnect,
    walletAddresses,
    mainAddress,
    recieveAddress,
    amount,
    fee,
    timelock = 0
) {
    let outputsAmount = 0;
    let keyPairs = [];
    let scripts = [];
    const usedOutpoints = new Set();

    const txb = new bitcoin.TransactionBuilder(mwc);
    txb.setVersion(2);

    // 🧠 Collect UTXOs
    for (let address in walletAddresses) {
        try {
            let utxo = await getUTXOs(address);

            if (!utxo || !Array.isArray(utxo)) {
                console.log("UTXO was null, fixing...");
                utxo = [];
            }

            // largest first
            utxo.sort((a, b) => b.value - a.value);

            for (let k = 0; k < utxo.length; k++) {

                if (outputsAmount >= (amount + fee)) break;

                // the same coin can come back under several address forms of one key: spend it once
                const outpoint = `${utxo[k].txid}:${utxo[k].index}`;
                if (usedOutpoints.has(outpoint)) continue;
                usedOutpoints.add(outpoint);

                const script = Buffer.from(utxo[k].script, 'hex');
                const type = getScriptType(script);

                const keyPair = bitcoin.ECPair.fromWIF(
                    walletAddresses[address].privateKey,
                    mwc
                );

                keyPairs.push(keyPair);

                if (type === 'bech32') {
                    const p2wpkh = getP2WPKHScript(keyPair.publicKey);

                    txb.addInput(
                        utxo[k].txid,
                        utxo[k].index,
                        null,
                        p2wpkh.output
                    );
                } else {
                    txb.addInput(utxo[k].txid, utxo[k].index);
                }

                const value = parseInt(utxo[k].value);
                outputsAmount += value;

                scripts.push({
                    script,
                    type,
                    value
                });
            }

            if (outputsAmount >= (amount + fee)) break;

        } catch (e) {
            console.log("UTXO fetch error:", e);
        }
    }

    if (outputsAmount < (amount + fee)) {
        return { error: "Insufficient funds" };
    }

    // 💸 Outputs
    try {
        const change = outputsAmount - amount - fee;

        txb.addOutput(recieveAddress, amount);

        if (change > 0) {
            if (!mainAddress) {
                return { error: "Main address error" };
            }
            txb.addOutput(mainAddress, change);
        }

    } catch (e) {
        return { error: e.message };
    }

    // 🔐 Sign inputs
    for (let i = 0; i < scripts.length; i++) {
        const value = scripts[i].value;

        try {
            switch (scripts[i].type) {
                case 'bech32':
                    txb.sign(i, keyPairs[i], null, null, value);
                    break;

                case 'segwit':
                    const redeem = getP2WPKHScript(keyPairs[i].publicKey);
                    const p2sh = getP2SHScript(redeem);

                    txb.sign(i, keyPairs[i], p2sh.redeem.output, null, value);
                    break;

                case 'legacy':
                    txb.sign(i, keyPairs[i]);
                    break;

                default:
                    console.log("Unknown script type:", scripts[i].type);
                    break;
            }
        } catch (e) {
            console.log("Signing error:", e);
            return { error: "Signing failed" };
        }
    }

    // 🚀 Build + Broadcast
    try {
        const txHex = txb.build().toHex();
        console.log("Transaction HEX:", txHex);

        let broadcast;

        try {
            // Form-encoded like web wallet
            const formData = qs.stringify({ raw: txHex });

            const res = await axios.post(`${API}/broadcast`, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            broadcast = res.data;
            console.log("Broadcast result:", broadcast);
            console.log("TX HEX LENGTH:", txHex.length);
            console.log("TX HEX:", txHex);

        } catch (e) {
            console.log("Broadcast error:", e?.response?.data || e.message);
            return { error: "Broadcast failed" };
        }

        // ✅ Validate response properly
        if (!broadcast || broadcast.error || !broadcast.result) {
            return {
                error: broadcast?.error?.message || "Broadcast failed"
            };
        }

        // ✅ SUCCESS → return txid only
        return { tx: broadcast.result };

    } catch (e) {
        console.log("Build error:", e.message);
        return { error: e.message };
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

	// Outputs paid to P2SH addresses that are not ours: these can be time locks created
	// with the web wallet (P2SH CLTV, addresses starting with "5"). See findLockUnlockTime.
	transaction.p2shOutputs = [];
	for (var k = 0; k < (transactionVerbose.vout || []).length; k++) {
		const out = transactionVerbose.vout[k];
		const outAddress = out && out.scriptPubKey && out.scriptPubKey.addresses && out.scriptPubKey.addresses[0];

		if (outAddress && !(outAddress in walletAddresses) && isP2SHAddress(outAddress)) {
			transaction.p2shOutputs.push({ address: outAddress, value: out.value });
		}
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

// Every txid for an address: confirmed history + mempool (so pending txs show up)
async function fetchAddressTxids(address) {
	const ids = [];

	try {
		const res = await axios.get(`${API}/history/${address}`);
		ids.push(...(res?.data?.result?.tx || []));
	} catch (e) {
		console.log("history error", e);
	}

	try {
		const res = await axios.get(`${API}/mempool/${address}`);
		ids.push(...(res?.data?.result?.tx || []));
	} catch (e) {
		// mempool lookup is best-effort
	}

	return ids;
}

export async function getTransactionHistory(socketConnect, walletAddresses, transactions = null) {
	const histories = await Promise.all(
		Object.keys(walletAddresses).map(fetchAddressTxids)
	);

	// remove duplicates
	const allTxids = [...new Set(histories.flat())];

	// What we already know: skip txs that are final (6+ confirmations) so polling stays cheap,
	// and keep the first-seen time of pending txs so their list entry doesn't jump around.
	const finalHashes = new Set();
	const knownTime = {};

	Object.values(transactions || {}).forEach((t) => {
		if (!t || !t.hash) return;
		if (t.confirmations >= 6 && (t.type !== 1 || t.p2shOutputs !== undefined)) finalHashes.add(t.hash);
		if (t.time) knownTime[t.hash] = t.time;
	});

	const nowSecs = Math.floor(Date.now() / 1000);
	let txObjects = {};

	await Promise.all(
		allTxids
			.filter((txid) => !finalHashes.has(txid))
			.map(async (txid) => {
				const tx = await getTransaction(txid);
				if (!tx) return;

				const parsed = await createTransactionObject(null, walletAddresses, tx);

				// unconfirmed txs have no block time yet: don't drop them
				parsed.time = parsed.time || knownTime[parsed.hash] || nowSecs;

				txObjects[parsed.time + parsed.hash] = parsed;
			})
	);

	return txObjects;
}

// Merge transaction maps by txid, so a pending tx is REPLACED (not duplicated) when it
// confirms and its key (time + hash) changes. Optionally drops pending txs the network
// no longer knows about (e.g. dropped from the mempool) after 2 hours.
export function mergeTransactions(existing = {}, incoming = {}, options = {}) {
	const incomingHashes = new Set(Object.values(incoming || {}).map((t) => t && t.hash));
	const nowSecs = Math.floor(Date.now() / 1000);
	const merged = {};

	Object.keys(existing || {}).forEach((key) => {
		const t = existing[key];
		if (!t) return;
		if (incomingHashes.has(t.hash)) return;

		if (options.dropStalePending && !(t.confirmations > 0) && t.time && nowSecs - t.time > 7200) {
			return;
		}

		merged[key] = t;
	});

	return { ...merged, ...incoming };
}

// Shorten a long string in the middle: "mwc1qabcd...wxyz1234"
export function shortenMiddle(str, head = 8, tail = 8) {
	if (!str) return "";
	if (str.length <= head + tail + 1) return str;

	return str.slice(0, head) + "…" + str.slice(-tail);
}

// Block explorer link for a transaction (EXPLORER_URL ends with "/", so strip it)
export function explorerTxUrl(hash) {
	const base = (Config.EXPLORER_URL || "").replace(/\/+$/, "");

	return base + "/#/transaction/" + hash;
}

// Net effect of unconfirmed transactions on the balance, in satoshis (negative = outgoing).
export function getPendingDelta(transactions = {}) {
	return Object.values(transactions || {}).reduce((sum, t) => {
		if (!t || t.confirmations > 0) return sum;

		const amount = Number(t.amount) || 0;
		return sum + (t.type ? -amount : amount);
	}, 0);
}

// One key has several address forms (legacy "9...", segwit "5...", bech32 "mwc1...") and the API can
// report the same coin under more than one of them. So any wallet holding more than one address
// (imported seeds, imported private keys) must count coins by txid:index, never per address.
export function shouldDedupeBalance(wallet) {
	return !!wallet && (!!wallet.isImported || Object.keys(wallet.addresses || {}).length > 1);
}

// Wallet balance in satoshis that THROWS if any request fails, so background refreshes
// can keep the last good balance instead of briefly showing a wrong (lower) one.
export async function getWalletBalanceStrict(addresses, isImported = false) {
	const addrs = Object.keys(addresses);

	if (isImported) {
		const lists = await Promise.all(
			addrs.map(async (a) => {
				const res = await axios.get(`${API}/unspent/${a}`);
				return res?.data?.result || [];
			})
		);

		const seen = new Set();
		let total = 0;

		lists.flat().forEach((u) => {
			const key = `${u.txid}:${u.index}`;
			if (seen.has(key)) return;
			seen.add(key);
			total += parseFloat(u.value) || 0;
		});

		return total;
	}

	const balances = await Promise.all(
		addrs.map(async (a) => {
			const res = await axios.get(`${API}/balance/${a}`);
			return parseFloat(res?.data?.result?.balance ?? 0) || 0;
		})
	);

	return balances.reduce((sum, b) => sum + b, 0);
}

export async function estimateFee(socketConnect, walletAddresses, options = {speed: "normal"}) {
	try {
		// 1️⃣ Get network fee
		const res = await axios.get(`${API}/fee`);
		let feerateSatPerKB = res.data.result.feerate; // satoshis per KB

		// Adjust fee based on speed preference
		const speedMultiplier = {
			slow: 0.7,
			normal: 1,
			fast: 1.5
		};
		feerateSatPerKB *= speedMultiplier[options.speed] || 1;

		// Convert sat/kB → sat/B
		const satPerByte = feerateSatPerKB / 1000;

		// 2️⃣ Estimate tx size
		// Count inputs from wallet addresses with balance
		let inputCount = 0;
		for (const addr in walletAddresses) {
			const balance = await socketConnect.get_balance(addr);
			if (balance && balance.balance > 0) inputCount += 1;
		}

		const outputCount = 2; // recipient + change

		// SegWit input size ~68 bytes, Legacy ~148 bytes
		const inputSize = 148;
		const outputSize = 34; // standard P2PKH/P2WPKH output
		const overhead = 10; // tx overhead

		const estimatedSize = inputCount * inputSize + outputCount * outputSize + overhead;

		// 3️⃣ Calculate fee in sats
		const feeSats = Math.ceil(satPerByte * estimatedSize);

		// 4️⃣ Convert to coin
		const feeCoin = feeSats / 100000000;

		return feeCoin.toFixed(6);

	} catch (e) {
		console.log("Smart fee error", e);
		// fallback
		return "0.00001";
	}
}

// Fetch current MWC price in USD
export async function getMWCPrice() {
    try {
        const res = await axios.get(`${API}/price`);
        const price = res.data.quotes?.USD?.price;
        if (!price || isNaN(price)) return 0;
        return parseFloat(price); // returns number like 0.000079236
    } catch (e) {
        console.log("MWC price fetch error", e);
        return 0;
    }
}

// Convert coin amount to USD (returns number, never string)
export async function convertMWCtoUSD(amountMWC) {
    const price = await getMWCPrice();
    const usdValue = amountMWC * price;
    return usdValue || 0;
}

// Example usage in transaction details
export async function attachUSDValueToTx(transaction) {
    if (!transaction.amount) return transaction;

    const usdValue = await convertMWCtoUSD(transaction.amount);
    return { ...transaction, usdValue }; // usdValue is number
}

// Example usage for wallet balances
export async function attachUSDValueToWallet(wallet) {
    let totalBalance = 0;

    for (const addr in wallet.addresses) {
        try {
            const res = await getAddressBalance(addr);
            if (res && res.confirmed != null) {
                totalBalance += parseFloat(res.confirmed) / 1e8; // sats → coins
            }
        } catch (e) {
            console.log("Error fetching address balance", e);
        }
    }

    const usdValue = await convertMWCtoUSD(totalBalance);
    return { ...wallet, totalBalance, usdValue }; // number
}

export const formatUSD = (value) => {
    if (value == null || isNaN(value)) return "$0.00";

    if (value < 0.0001) return "< $0.0001";
    if (value < 0.01) return "$" + value.toFixed(4);

    return "$" + value.toFixed(2);
};

export async function getAddressBalance(address) {
    try {
        const res = await axios.get(`${API}/balance/${address}`);

        // check response structure safely
        const balance = res?.data?.result?.balance ?? 0;

        return {
            confirmed: parseFloat(balance),  // still in satoshis
            unconfirmed: 0
        };
    } catch (e) {
        console.log("balance error", e);
        return { confirmed: 0, unconfirmed: 0 };
    }
}

export async function getUTXOs(address) {
	try {
		const res = await axios.get(`${API}/unspent/${address}`);
		return res.data.result;
	} catch (e) {
		console.log("utxo error", e);
		return [];
	}
}

export async function getWalletBalanceFromUTXOs(addresses) {
    try {
        const seen = new Set();

        const utxoArrays = await Promise.all(
            Object.keys(addresses).map(addr => getUTXOs(addr))
        );

        let totalSats = 0;

        utxoArrays.flat().forEach(u => {
            const key = `${u.txid}:${u.index}`;

            if (seen.has(key)) return;

            seen.add(key);
            totalSats += u.value || 0;
        });

        return { confirmed: totalSats };

    } catch (e) {
        console.log("UTXO BALANCE ERROR:", e);
        return { confirmed: 0 };
    }
}

export async function getTransaction(txid) {
	try {
		const res = await axios.get(`${API}/transaction/${txid}`);
		return res.data.result;
	} catch (e) {
		console.log("tx fetch error", e);
		return null;
	}
}

export async function checkMempool(socketConnect, walletAddresses, address, callback) {
	try {
		let res = await axios.get(`${API}/mempool/${address}`);
		let mempool = res.data.result.tx || [];

		let mempoolObjects = {};

		await Promise.all(
			mempool.map(async (txid) => {
				const tx = await getTransaction(txid);
				if (!tx) return;

				const parsed = await createTransactionObject(null, walletAddresses, tx);
				mempoolObjects[parsed.time + parsed.hash] = parsed;
			})
		);

		callback(mempoolObjects, false);

		let interval = setInterval(async () => {
			try {
				let newRes = await axios.get(`${API}/mempool/${address}`);
				let newMempool = newRes.data.result.tx || [];

				if (JSON.stringify(mempool) !== JSON.stringify(newMempool)) {
					let newObjects = {};

					await Promise.all(
						newMempool.map(async (txid) => {
							const tx = await getTransaction(txid);
							if (!tx) return;

							const parsed = await createTransactionObject(null, walletAddresses, tx);
							newObjects[parsed.time + parsed.hash] = parsed;
						})
					);

					callback(newObjects, true);
					mempool = newMempool;
				}

				if (newMempool.length === 0) {
					clearInterval(interval);
				}
			} catch (e) {
				console.log("mempool polling error", e);
			}
		}, 5000);

	} catch (e) {
		console.log('mempool error: ', e);
	}
}


// ===================== Time locks (P2SH CLTV, created by the web wallet) =====================
// A lock is a P2SH address (version byte 10, so it always starts with "5") wrapping
//     <unlock-time> OP_CHECKLOCKTIMEVERIFY OP_DROP <33-byte pubkey> OP_CHECKSIG
// The unlock time stays hidden on-chain until the coins are spent and the API cannot list locks,
// so the wallet finds them itself: it takes the P2SH addresses it has sent coins to and tries
// the unlock times the web wallet's presets would have produced (see findLockUnlockTime).

export const LOCK_PRESET_DAYS = [30, 60, 90, 180, 365];
const CLTV_TIME_THRESHOLD = 500000000; // below this a CLTV value is a block height, not a date

export function isP2SHAddress(address) {
	try {
		return bitcoin.address.fromBase58Check(address).version === mwc.scriptHash;
	} catch (e) {
		return false;
	}
}

// Public key (hex) the web wallet uses for this wallet: the first receive address,
// m/44'/0'/0'/0/0 (or the imported private key for WIF wallets).
export function getWalletLockPubkey(wallet) {
	try {
		const entry = wallet && wallet.addresses && wallet.addresses[wallet.receiveAddress];

		if (!entry || !entry.privateKey) return null;

		return bitcoin.ECPair.fromWIF(entry.privateKey, mwc).publicKey.toString('hex');
	} catch (e) {
		return null;
	}
}

export function lockRedeemScript(unlockTime, pubkeyHex) {
	const lockBytes = bitcoin.script.number.encode(unlockTime);

	return Buffer.concat([
		Buffer.from([lockBytes.length]),
		lockBytes,
		Buffer.from([0xb1, 0x75, 0x21]), // OP_CHECKLOCKTIMEVERIFY OP_DROP <push 33 bytes>
		Buffer.from(pubkeyHex, 'hex'),
		Buffer.from([0xac])              // OP_CHECKSIG
	]);
}

export function lockAddress(unlockTime, pubkeyHex) {
	return bitcoin.address.toBase58Check(
		bitcoin.crypto.hash160(lockRedeemScript(unlockTime, pubkeyHex)),
		mwc.scriptHash
	);
}

// Tries every unlock time in the given ranges against the given lock addresses.
// Returns { index, unlockTime } for the first match (index = position in `addresses`), else null.
// Works in small slices so the UI stays responsive.
async function searchLockTimes(pubkeyHex, addresses, ranges, shouldCancel) {
	const pub = Buffer.from(pubkeyHex || "", 'hex');
	if (pub.length !== 33) return null;

	const targets = addresses.map((a) => {
		try {
			const d = bitcoin.address.fromBase58Check(a);
			return d.version === mwc.scriptHash ? d.hash : null;
		} catch (e) {
			return null;
		}
	});

	// Fast path: unlock times from 0x800000 to 0x7fffffff are always encoded in exactly 4 bytes,
	// so the script is a fixed 42-byte template where only the 4 time bytes change.
	const script = Buffer.alloc(42);
	script[0] = 4;
	script[5] = 0xb1;
	script[6] = 0x75;
	script[7] = 0x21;
	pub.copy(script, 8);
	script[41] = 0xac;

	const SLICE_MS = 8; // work for ~8 ms at a time, then let taps and animations run
	let sliceStart = Date.now();
	let checked = 0;

	for (const range of ranges) {
		const from = Math.max(range.from, 0x800000);
		const to = Math.min(range.to, 0x7fffffff);

		for (let t = from; t <= to; t++) {
			script[1] = t & 0xff;
			script[2] = (t >>> 8) & 0xff;
			script[3] = (t >>> 16) & 0xff;
			script[4] = (t >>> 24) & 0xff;

			const hash = bitcoin.crypto.hash160(script);

			for (let i = 0; i < targets.length; i++) {
				if (targets[i] && hash.equals(targets[i])) {
					return { index: i, unlockTime: t };
				}
			}

			if ((++checked & 7) === 0 && Date.now() - sliceStart >= SLICE_MS) {
				await new Promise((resolve) => setTimeout(resolve, 6));
				if (shouldCancel && shouldCancel()) return null;
				sliceStart = Date.now();
			}
		}
	}

	return null;
}

// The web wallet sets the unlock time to (moment you pick a preset) + 30/60/90/180/365 days,
// shortly before the lock is funded. So the unlock time lies just before
// (funding time + preset days): look back 6 hours, with 10 minutes of clock slack.
export async function findLockUnlockTime(pubkeyHex, address, fundTime, shouldCancel) {
	const ranges = LOCK_PRESET_DAYS.map((days) => ({
		from: fundTime + days * 86400 - 6 * 3600,
		to: fundTime + days * 86400 + 600
	}));

	const hit = await searchLockTimes(pubkeyHex, [address], ranges, shouldCancel);

	return hit ? hit.unlockTime : null;
}

// Manual lookup: which of `addresses` is the lock for an unlock time between from and to?
export async function findLockInRange(pubkeyHex, addresses, from, to) {
	return searchLockTimes(pubkeyHex, addresses, [{ from, to }]);
}

// Confirmed balance (satoshis) of a lock address. Throws on network failure.
export async function getLockBalance(address) {
	const res = await axios.get(`${API}/balance/${address}`);

	return parseFloat(res?.data?.result?.balance ?? 0) || 0;
}

// P2SH outputs the wallet has sent coins to that might be locks (earliest funding time kept).
export function collectLockCandidates(transactions, addresses) {
	const own = addresses || {};
	const found = {};
	const nowSecs = Math.floor(Date.now() / 1000);

	Object.values(transactions || {}).forEach((t) => {
		if (!t || t.type !== 1 || !Array.isArray(t.p2shOutputs)) return;

		t.p2shOutputs.forEach((o) => {
			if (!o || !o.address || o.address in own) return;

			const fundTime = t.time || nowSecs;

			if (!found[o.address] || fundTime < found[o.address].fundTime) {
				found[o.address] = { address: o.address, fundTime, txid: t.hash };
			}
		});
	});

	return Object.values(found);
}

// Split the known locks into still-locked and unlocked-but-not-yet-redeemed coins.
export function summarizeLocks(locks, nowSec) {
	const list = Object.values(locks || {})
		.filter((l) => l && l.balance > 0)
		.map((l) => ({ ...l, unlocked: l.unlockTime <= nowSec }))
		.sort((a, b) => a.unlockTime - b.unlockTime);

	const locked = list.filter((l) => !l.unlocked);
	const ready = list.filter((l) => l.unlocked);
	const sum = (arr) => arr.reduce((total, l) => total + l.balance, 0);

	return {
		list,
		hasLocks: list.length > 0,
		lockedSats: sum(locked),
		readySats: sum(ready),
		lockedCount: locked.length,
		nextUnlock: locked.length ? locked[0].unlockTime : null
	};
}

export function formatLockRemaining(secs) {
	secs = Math.max(0, Math.floor(secs));

	const d = Math.floor(secs / 86400);
	const h = Math.floor((secs % 86400) / 3600);
	const m = Math.floor((secs % 3600) / 60);

	if (d > 0) return d + "d " + h + "h";
	if (h > 0) return h + "h " + m + "m";
	if (m > 0) return m + "m";

	return secs > 0 ? "<1m" : "0m";
}

// Unlock time typed by the user: unix seconds, "YYYY-MM-DD HH:mm:ss" (exact) or
// "YYYY-MM-DD HH:mm" (any second within that minute). Local time. Returns null if not understood.
export function parseUnlockInput(text) {
	const s = String(text || "").trim();

	if (/^\d{9,10}$/.test(s)) {
		const t = parseInt(s, 10);
		return t >= CLTV_TIME_THRESHOLD ? { exact: t } : null;
	}

	const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
	if (!m) return null;

	const [y, mo, d, h, mi] = [+m[1], +m[2], +m[3], +m[4], +m[5]];
	const sec = m[6] !== undefined ? +m[6] : 0;
	const date = new Date(y, mo - 1, d, h, mi, sec);

	// reject impossible dates such as 2026-02-31
	if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d ||
		date.getHours() !== h || date.getMinutes() !== mi) return null;

	const t = Math.floor(date.getTime() / 1000);

	if (t < CLTV_TIME_THRESHOLD) return null;

	return m[6] !== undefined ? { exact: t } : { from: t, to: t + 59 };
}


// ===================== Redeeming and creating time locks =====================

const LOCK_SEQUENCE = 0xfffffffe; // anything below 0xffffffff keeps nLockTime (and so the lock) enforced
const DUST_SATS = 546;

// Push of a byte string inside a scriptSig (signatures and the lock script are both < 76 bytes)
function pushData(bytes) {
	if (bytes.length < 76) return Buffer.concat([Buffer.from([bytes.length]), bytes]);
	if (bytes.length <= 0xff) return Buffer.concat([Buffer.from([0x4c, bytes.length]), bytes]);

	throw new Error("Pushdata too large for a lock scriptSig");
}

// Confirmed coins sitting at a lock address. Throws on network failure.
export async function getLockUtxos(address) {
	const res = await axios.get(`${API}/unspent/${address}`);

	return Array.isArray(res?.data?.result) ? res.data.result : [];
}

// Same default fee the Send screen starts with: the network's feerate if available, else 0.0001 MWC.
export async function getDefaultFeeSats() {
	try {
		const res = await Promise.race([
			global.socketConnect.get_general_fee(),
			new Promise((_, reject) => setTimeout(() => reject(new Error("fee lookup timed out")), 1500))
		]);
		const feerate = Number(res && res.feerate);

		if (feerate > 0) return Math.round(feerate);
	} catch (e) {}

	return 10000;
}

// Builds and signs the transaction that moves a matured lock back to `toAddress`.
// Mirrors the web wallet's redeemLock(): every coin at the lock address is an input
// (sequence 0xfffffffe), one output (total - fee), locktime = the unlock time, and each
// input's scriptSig is <signature> <redeemScript>. Throws a readable Error if anything
// doesn't check out, BEFORE anything is signed.
export function buildLockRedeemTransaction({ wif, address, unlockTime, utxos, toAddress, fee, nowSec }) {
	if (!(unlockTime >= CLTV_TIME_THRESHOLD)) {
		throw new Error("Only time-based locks can be redeemed here.");
	}

	if (!(nowSec >= unlockTime)) {
		throw new Error("This lock has not reached its unlock time yet.");
	}

	if (!Number.isSafeInteger(fee) || fee < 0) {
		throw new Error("Invalid network fee.");
	}

	const keyPair = bitcoin.ECPair.fromWIF(wif, mwc);
	const pubkeyHex = keyPair.publicKey.toString('hex');

	// the lock must really be this wallet's lock
	if (lockAddress(unlockTime, pubkeyHex) !== address) {
		throw new Error("This lock does not belong to this wallet's key.");
	}

	const redeemScript = lockRedeemScript(unlockTime, pubkeyHex);
	const lockOutput = Buffer.concat([Buffer.from([0xa9, 0x14]), bitcoin.crypto.hash160(redeemScript), Buffer.from([0x87])]);

	// every coin once, and only coins that really sit in this lock
	const seen = new Set();
	const coins = [];

	for (const u of utxos || []) {
		const value = Number(u.value);
		const index = Number(u.index);

		if (!/^[0-9a-fA-F]{64}$/.test(String(u.txid)) || !Number.isInteger(index) || index < 0 || !(value > 0)) {
			throw new Error("Unexpected data for the locked coins. Refresh and try again.");
		}

		if (u.script && String(u.script).toLowerCase() !== lockOutput.toString('hex')) {
			throw new Error("A coin at this lock address has an unexpected script.");
		}

		const key = u.txid + ":" + index;
		if (seen.has(key)) continue;
		seen.add(key);

		coins.push({ txid: u.txid, index, value });
	}

	if (coins.length === 0) {
		throw new Error("There are no coins to redeem at this lock address right now.");
	}

	const total = coins.reduce((sum, c) => sum + c.value, 0);
	const outValue = total - fee;

	if (outValue < DUST_SATS) {
		throw new Error("The locked amount is too small to cover the network fee.");
	}

	const txb = new bitcoin.TransactionBuilder(mwc);
	txb.setLockTime(unlockTime);

	for (const c of coins) {
		txb.addInput(c.txid, c.index, LOCK_SEQUENCE);
	}

	txb.addOutput(toAddress, outValue);

	const tx = txb.buildIncomplete();

	coins.forEach((c, i) => {
		const sigHash = tx.hashForSignature(i, redeemScript, bitcoin.Transaction.SIGHASH_ALL);
		const derSig = bitcoin.script.signature.encode(keyPair.sign(sigHash), bitcoin.Transaction.SIGHASH_ALL);

		tx.setInputScript(i, Buffer.concat([pushData(derSig), pushData(redeemScript)]));
	});

	return { hex: tx.toHex(), txid: tx.getId(), amount: outValue, fee, inputs: coins.length };
}

// Broadcast a raw transaction (same request the Send screen makes).
// Returns { tx: txid } or { error: message }.
export async function broadcastRawTransaction(txHex) {
	try {
		const res = await axios.post(`${API}/broadcast`, qs.stringify({ raw: txHex }), {
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
		});

		const data = res.data;

		if (!data || data.error || !data.result) {
			return { error: (data && data.error && (data.error.message || String(data.error))) || "Broadcast failed" };
		}

		return { tx: data.result };
	} catch (e) {
		const detail = e && e.response && e.response.data && e.response.data.error;

		return { error: (detail && (detail.message || String(detail))) || (e && e.message) || "Broadcast failed" };
	}
}

// Plain-language version of a broadcast rejection.
export function friendlyBroadcastError(message) {
	const m = String(message || "");

	if (/non-?final|locktime|lock time/i.test(m)) {
		return "The network doesn't accept this yet. Its clock runs about an hour behind real time, so try again in a little while.";
	}

	if (/missing ?inputs|already|conflict|spent|bad-txns-inputs/i.test(m)) {
		return "These coins were already spent, or a transaction spending them is already waiting to confirm.";
	}

	if (/fee|relay/i.test(m)) {
		return "The network rejected the transaction fee (" + m + "). Please try again.";
	}

	return m || "The transaction could not be sent.";
}
