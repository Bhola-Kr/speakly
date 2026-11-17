import * as admin from 'firebase-admin';

// Keep a live cache through the transaction. Otherwise a cold Admin SDK cache
// can invoke the callback with null and abort before contacting RTDB.
export async function runDataTransaction(
  ref: admin.database.Reference,
  update: (value: any) => any,
) {
  const listener = (_snapshot: admin.database.DataSnapshot) => {};
  ref.on('value', listener);
  try {
    await ref.once('value');
    return await ref.transaction(update);
  } finally {
    ref.off('value', listener);
  }
}
