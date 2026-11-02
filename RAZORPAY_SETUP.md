# Razorpay wallet payment setup

The mobile app creates Razorpay orders through the Firebase backend. Wallet
credit is performed only after the backend verifies a captured payment with
Razorpay. The existing idempotency marker prevents duplicate wallet credits.

## Firebase parameters

Set these values when Firebase prompts during deployment:

- `RAZORPAY_KEY_ID`: the Razorpay key ID
- `RAZORPAY_KEY_SECRET`: the matching key secret
- `RAZORPAY_WEBHOOK_SECRET`: a separate webhook signing secret

Deploy the API and payment reconciliation function:

```sh
firebase deploy --only functions:api,functions:reconcilePayuPayments
```

## Razorpay dashboard

Create a webhook for captured and failed payment events at:

```text
https://us-central1-recent-chat-7fd34.cloudfunctions.net/api/razorpay/webhook
```

Use the same value in the dashboard and `RAZORPAY_WEBHOOK_SECRET`. Enable
automatic capture in the Razorpay dashboard so a successful checkout reaches
the `captured` state. The key secret and webhook secret must never be added to
the mobile application.

Before production rollout, test successful, failed, cancelled, and interrupted
payments and confirm that the wallet is credited exactly once.
