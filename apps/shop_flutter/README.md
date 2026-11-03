# Shop OS Flutter storefront

Flutter client for the Shop OS customer storefront. It provides one responsive UI codebase for Android, iOS, and Flutter Web, with native app spacing, safe-area handling, and a fixed four-item storefront navigation bar.

## Migrated storefront routes

- Storefront: home, category browsing, product search and detail, cart, checkout, order history
- Account: login, invite-code registration (`/r/:inviteCode`), profile, addresses, favorites, browsing history, notifications, help, work orders, and rules
- Membership: gift-zone packages and benefits, monthly credit history, credit-pool SKU selection and redemption, resell requests and records
- Agent tools: dashboard, commission records and withdrawal requests, payout account binding, team levels, invitation links, and QR posters using the saved poster layout
- Address entry and checkout use the bundled nationwide province/city/county dataset (34 province-level entries, 369 cities, and 3,479 counties/districts), adapted from the existing `@vant/area-data` dependency
- Product detail supports both add-to-cart and direct checkout; direct purchases do not alter an existing cart line
- Flutter Web uses path URLs so shared `/r/:inviteCode` links open the invite registration screen
- The in-app brand logo loads from the admin-managed public site configuration at startup and when the app returns to the foreground; the bundled logo is used when the API or image is unavailable. The installed launcher icon remains part of the app package.

## Requirements and setup

- Flutter SDK 3.22 or newer (Dart 3.4+)
- Shop OS API server

Generate platform host projects once from this directory, then install dependencies:

```sh
flutter create --platforms=android,ios,web .
flutter pub get
```

Run the app against the development API. Android emulators use `10.0.2.2`; a physical phone must use the development computer's LAN address:

```sh
flutter run --flavor local --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1
flutter run --flavor local --dart-define=API_BASE_URL=http://192.168.1.20:3000/api/v1
```

The `local` Android flavor uses the `.local` application ID suffix so it can be installed beside an existing app, and permits cleartext only for development. The `production` flavor does not enable cleartext traffic. The default API URL is `http://localhost:3000/api/v1` on Web and iOS Simulator. Configure the iOS App Transport Security policy for the deployment endpoint in the generated Runner project.

Build commands:

```sh
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000/api/v1
flutter build apk --release --flavor production --dart-define=API_BASE_URL=https://api.example.com/api/v1
flutter build appbundle --release --flavor production --dart-define=API_BASE_URL=https://api.example.com/api/v1
flutter build web --release --dart-define=API_BASE_URL=https://api.example.com/api/v1
```

For a locally installable Android build on a physical phone, replace the LAN IP with the development computer's current address:

```sh
flutter build apk --release --flavor local --split-per-abi --dart-define=API_BASE_URL=http://192.168.1.20:3000/api/v1
```

## Rollout notes

The Vue + Capacitor app remains in the repository as a rollback baseline. Switch the production H5/Android delivery to Flutter after generating the platform hosts and building the Flutter targets in an environment with the Flutter SDK.

Checkout, membership purchase, and credit redemption retain the existing mock payment flow. The backend currently exposes WeChat/Alipay provider configuration and credentials, but this migration does not add native payment SDK launch, signed callbacks, or refunds; those require the corresponding payment-provider integration on the service side as well.
