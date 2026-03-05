# MinersWorldCoin-mobile-wallet

MinersWorldCoin mobile wallet working on React Native

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See `Installation` for notes on how to deploy the project on your system.

### Requirements

- [Node](https://nodejs.org) 4.x or higher
- [React Native](http://facebook.github.io/react-native/docs/getting-started.html) for development
- [Xcode](https://developer.apple.com/xcode/) for iOS development (optional)
- [Android SDK](https://developer.android.com/sdk/) for Android development (optional)
- [Android Lollipop](https://www.android.com/versions/lollipop-5-0/) or higher for Android device testing (optional)

### Installation

Clone repository:

```
git clone [link]
```

Install node modules:

```
yarn install 
```

Install pod dependencies for IOS:

```
&& cd ios && pod install && cd ..
```

Refactor libraries to AndroidX:

```
npx jetify
```

## Running

Once dependencies are installed, run the starter kit with:

```
yarn start
```

This will start the React Packager.

### iOS

Open workspace `ios/aokey.xcworkspace` in Xcode, build and run the project (⌘+R).

### Android

For android development use the following:

```
react-native run-android
```
