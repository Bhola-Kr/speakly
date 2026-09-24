# Male signup offer

The male Home screen listens to these Realtime Database values:

```text
configs/isActiveOffer
configs/offerdAmount
```

`isActiveOffer` must be a boolean and `offerdAmount` must be a positive number.
Changing either value updates the offer modal live. Setting `isActiveOffer` to
`false` immediately hides the offer and subsequent claim attempts re-read the
configuration and fail.

Claiming performs one transaction on the signed-in user's record. The same
transaction increments `wallet/balance` and creates:

```text
users/{uid}/offers/signupOffer/claimedAt
users/{uid}/offers/signupOffer/amount
```

The marker prevents a second claim even after reinstalling or logging in on a
different device. Female users, invalid amounts, missing users, malformed wallet
balances, duplicate taps, and previously claimed users are rejected safely.

For strict server-enforced protection, Realtime Database rules or a trusted
Cloud Function should also require a male profile, an active config, and an
absent claim marker. Client checks prevent normal app misuse but cannot secure a
modified application.
