# F-Droid submission draft

This repository contains a source-build recipe in `.fdroid.yml` for package
`com.minersworldcoin.wallet`, version `1.0.5` (version code `105`). It is a
draft: the React Native/Yarn build has not been run in F-Droid's build
environment.

## Before opening the merge request

1. Merge the source PR into the official repository:
   `https://github.com/Miners-World-Coin-MWC/MinersWorldCoin-Mobile-Wallets`.
2. From that repository, identify the full 40-character commit hash containing
   the final 1.0.5 source and replace the conspicuous `commit` placeholder in
   `.fdroid.yml`. F-Droid metadata requires the full commit hash, not a branch
   or tag name.
3. Create and push a version tag only after the 1.0.5 source is finalized. Do
   not reuse a tag for changed source.
4. Run the recipe with current `fdroidserver` in a Linux environment, then fix
   any lint, source scan, or build errors reported by F-Droid. This machine does
   not have `fdroidserver` or a working WSL distribution, so that check is still
   outstanding.
5. Review the wallet's required connection to `api.minersworld.org` with F-Droid
   maintainers and add any applicable `AntiFeatures` metadata. The app depends
   on this service for network-backed wallet data and transactions.
6. Confirm all included app assets and dependencies have compatible licenses.
   The app's MIT `LICENSE` does not automatically license third-party assets.

## Submit

After those checks, fork `fdroiddata`, copy `.fdroid.yml` to
`metadata/com.minersworldcoin.wallet.yml`, and open a merge request against the
F-Droid data repository. The metadata MR is separate from this app source
repository. F-Droid's CI will run its own lint/build checks and reviewers may
ask for changes.

## Existing Android users

F-Droid signs its build with a different key from the APK distributed through
GitHub. Android will not install it as an in-place update over that APK. Users
will need to back up their wallet recovery phrase, uninstall the GitHub build,
then install the F-Droid build and restore their wallet.
