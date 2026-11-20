# MinersWorldCoin Mobile Wallet

MinersWorldCoin Mobile Wallet built with React Native.

---

# Features

* Multi-platform mobile wallet
* Android support
* iOS support
* Secure wallet generation
* Wallet import support
* QR code scanning
* Transaction sending and receiving
* Biometric authentication support
* Multi-language support

---

# Requirements

Before getting started, install the following:

* Node.js 18+ recommended
* Yarn
* React Native development environment
* Android Studio + Android SDK (for Android builds)
* Xcode 15+ (for iOS builds on macOS only)
* CocoaPods (for iOS dependencies)

Official setup guides:

* React Native Environment Setup:
  https://reactnative.dev/docs/environment-setup

---

# Installation

## Clone Repository

```bash
git clone https://github.com/Miners-World-Coin-MWC/MinersWorldCoin-Mobile-Wallets
cd MinersWorldCoin-mobile-wallet
```

---

## Install Dependencies

```bash
yarn install
```

---

## iOS Setup

Install CocoaPods dependencies:

```bash
cd ios
pod install
cd ..
```

---

## Android Setup

Jetifier is no longer required for modern React Native versions and AndroidX support.

---

# Running the Development Server

Start the Metro bundler:

```bash
yarn start
```

---

# Running on Android

Make sure an emulator or Android device is connected.

Run:

```bash
npx react-native run-android
```

---

# Running on iOS

Open the workspace:

```text
ios/MinersWorldCoin.xcworkspace
```

Then build and run using Xcode (`⌘ + R`).

Or run from terminal:

```bash
npx react-native run-ios
```

---

# Building Release Versions

## Android APK / AAB

Generate release builds using Android Studio or Gradle.

Example:

```bash
cd android
./gradlew assembleRelease
```

Release APK output:

```text
android/app/build/outputs/apk/release/
```

---

## iOS IPA

iOS builds require macOS and Xcode.

Unsigned IPA builds can be generated through GitHub Actions or Xcode archives.

Note:

* iOS apps may require sideloading if not distributed through the Apple App Store.
* Free Apple IDs may require users to refresh the app every 7 days.

See:


[HowToSideLoad.md](https://github.com/Miners-World-Coin-MWC/MinersWorldCoin-Mobile-Wallets/blob/master/HowToSideLoad.md)

for installation instructions.

---

# CI/CD

This project supports automated builds using GitHub Actions.

Current CI pipeline supports:

* Android builds
* iOS builds
* Unsigned IPA generation

---

# Security Notice

* Always verify official release files before installing.
* Never share recovery phrases or private keys.
* Only download wallet builds from official project sources.

---

# Troubleshooting

## iOS Pod Issues

Try:

```bash
cd ios
pod repo update
pod install
```

---

## Metro Cache Problems

```bash
npx react-native start --reset-cache
```

---

## Android Build Problems

Clean Gradle build:

```bash
cd android
./gradlew clean
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

The Android QR scanner uses ZXing Core under Apache-2.0 and React Native Camera Kit under MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

---

# Disclaimer

This software is provided as-is without warranty.

Use at your own risk.

Always securely back up your wallet and recovery phrase.
