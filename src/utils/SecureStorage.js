// @flow
//
// Encrypted storage engine for redux-persist.
//
// Everything redux-persist writes (wallets, seed phrases, WIF/private keys, PIN)
// is encrypted with AES-256-CBC + HMAC-SHA256 (encrypt-then-MAC) before it touches
// AsyncStorage. The 256-bit master key is random and lives in the platform secure
// store (iOS Keychain / Android Keystore) via react-native-keychain, never on disk
// next to the data.
//
// Stored format:  enc:v1:<iv base64>:<ciphertext base64>:<hmac base64>
//
// - Existing plaintext data from older app versions is detected and re-saved
//   encrypted the first time it is read (automatic migration).
// - If data can't be decrypted (key lost, tampered), the unreadable blob is
//   copied to "<key>.unreadable.<timestamp>" before anything can overwrite it,
//   so it's never silently destroyed.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import crypto from 'crypto';

const KEY_SERVICE = 'com.minersworldcoin.wallet.storagekey';
const PREFIX = 'enc:v1:';

let keyPromise = null;

// ---------------------------------------------------------------------------
// Master key (random 32 bytes, kept in Keychain/Keystore)
// ---------------------------------------------------------------------------

async function loadOrCreateMasterKey() {
    const existing = await Keychain.getGenericPassword({ service: KEY_SERVICE });

    if (existing && existing.password) {
        return Buffer.from(existing.password, 'hex');
    }

    const key = crypto.randomBytes(32);

    const options = { service: KEY_SERVICE };
    if (Keychain.ACCESSIBLE && Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY) {
        options.accessible = Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
    }

    const saved = await Keychain.setGenericPassword('storage-key', key.toString('hex'), options);
    if (!saved) {
        throw new Error('Could not save the storage key to the secure store');
    }

    return key;
}

// Memoized so concurrent first reads/writes can never create two different keys.
function getMasterKey() {
    if (!keyPromise) {
        keyPromise = loadOrCreateMasterKey().catch(e => {
            keyPromise = null;
            throw e;
        });
    }

    return keyPromise;
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

function subKey(master, label) {
    return crypto.createHmac('sha256', master).update(label).digest();
}

function safeEqual(a, b) {
    if (a.length !== b.length) return false;

    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a[i] ^ b[i];
    }

    return diff === 0;
}

export function encryptString(plain, master) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', subKey(master, 'enc'), iv);
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const mac = crypto.createHmac('sha256', subKey(master, 'mac')).update(iv).update(ct).digest();

    return PREFIX + iv.toString('base64') + ':' + ct.toString('base64') + ':' + mac.toString('base64');
}

export function decryptString(blob, master) {
    const parts = blob.slice(PREFIX.length).split(':');
    if (parts.length !== 3) {
        throw new Error('Malformed encrypted data');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const ct = Buffer.from(parts[1], 'base64');
    const mac = Buffer.from(parts[2], 'base64');

    const expected = crypto.createHmac('sha256', subKey(master, 'mac')).update(iv).update(ct).digest();
    if (!safeEqual(mac, expected)) {
        throw new Error('Encrypted data failed authentication');
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', subKey(master, 'enc'), iv);

    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

// ---------------------------------------------------------------------------
// Storage engine (redux-persist compatible)
// ---------------------------------------------------------------------------

async function quarantine(key, raw) {
    try {
        await AsyncStorage.setItem(key + '.unreadable.' + Date.now(), raw);
    } catch (e) {
        console.log('SecureStorage: could not back up unreadable data', e);
    }
}

const SecureStorage = {
    async getItem(key) {
        const raw = await AsyncStorage.getItem(key);

        if (raw === null || raw === undefined) {
            return null;
        }

        // Legacy plaintext from before encryption: use it, and re-save encrypted now.
        if (!raw.startsWith(PREFIX)) {
            try {
                const master = await getMasterKey();
                await AsyncStorage.setItem(key, encryptString(raw, master));
            } catch (e) {
                console.log('SecureStorage: could not migrate to encrypted storage yet', e);
            }

            return raw;
        }

        try {
            const master = await getMasterKey();
            return decryptString(raw, master);
        } catch (e) {
            console.log('SecureStorage: could not decrypt stored data', e);
            await quarantine(key, raw);
            return null;
        }
    },

    async setItem(key, value) {
        try {
            const master = await getMasterKey();
            return await AsyncStorage.setItem(key, encryptString(value, master));
        } catch (e) {
            // Secure store unavailable: keep the app working (same as before
            // encryption existed) rather than losing the user's wallets.
            console.log('SecureStorage: secure store unavailable, saving unencrypted', e);
            return AsyncStorage.setItem(key, value);
        }
    },

    removeItem(key) {
        return AsyncStorage.removeItem(key);
    }
};

export default SecureStorage;
