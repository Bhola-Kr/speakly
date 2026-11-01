# PayU wallet payment setup

The app now creates payment attempts on the Firebase backend, opens PayU Checkout Pro, verifies the result with PayU, and credits the wallet only after server verification. A scheduled function rechecks unfinished payments every 10 minutes.

## Firebase configuration

The PayU merchant key and salt are configured directly in the Firebase backend source. They are not included in the React Native application bundle.

`PAYU_ENVIRONMENT` defaults to `production`. Override it through the Firebase parameter prompt only when deploying a test environment.

Deploy both exported functions:

```sh
firebase deploy --only functions:api,functions:reconcilePayuPayments
```

## PayU dashboard

Configure the server-to-server payment callback URL as:

```text
https://us-central1-recent-chat-7fd34.cloudfunctions.net/api/payu/callback
```

Use the callback URL for both successful and failed payment updates. Do not put the merchant salt or merchant key in the mobile app.

## Release check

Before enabling production, complete one successful and one failed transaction with PayU test credentials. Confirm that:

- a successful payment appears in Transaction History;
- the wallet is credited exactly once;
- retrying verification does not add balance again;
- a cancelled or failed payment does not add balance;
- an interrupted pending payment is resolved by reconciliation.
