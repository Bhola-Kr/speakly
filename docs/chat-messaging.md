# Chat messaging

Male users have a Chat tab that lists female users whose root-level
`isChatHost` field is `true`. New users receive `isChatHost: false` during
account creation. An administrator can enable the field from Manage Users.

Messages are stored under `chats/{conversationId}/messages` and update the
conversation's participants, last message, and timestamp. A male sender pays
one coin for text and two coins for voice; an enabled female chat host can send
either type without a wallet deduction. Wallet deductions use a Realtime
Database transaction; if the message write fails, the client attempts to refund
the charge. Users without a sufficient balance are offered a link to Wallet.
Enabled female hosts receive a Chat tab containing their member conversations.

While a conversation is open, `chatPresence/{uid}` stores online/offline and
last-seen information, and `chats/{conversationId}/typing/{uid}` stores the
temporary typing indicator. Disconnect handlers clear typing and mark the user
offline if the app loses its Firebase connection.

The microphone button currently displays the voice-message flow placeholder.
The service and message model support the two-coin voice price, but recording,
upload, and playback are not yet implemented, so no voice charge occurs yet.

Realtime Database rules must enforce participant-only chat reads, validate
message fields, prevent clients from bypassing billing, and grant only admins
permission to change `isChatHost`. Add an index for `users/isChatHost` to avoid
unindexed host queries and an index for `chats/hostUid` for host inboxes. Rules
must also allow users to write only their own presence and typing values. For
production-grade billing, move the wallet deduction
and message creation into a trusted backend operation so both changes are
committed atomically.
