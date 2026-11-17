// Display-only projection of the shared billing checkpoint. Wallet deductions
// continue to use backend-confirmed intervals, never this value.
export type CallTimerSnapshot = {
  status: string;
  billableMs?: number;
  billingSince?: number | null;
  billingConfirmedAt?: number;
  male?: { uid: string } | null;
  female?: { uid: string };
  billingReports?: Record<string, { connected: boolean; seenAt: number }>;
};

const CONNECTION_LEASE_MS = 15000;

export function callDisplayMilliseconds(
  room: CallTimerSnapshot | null,
  serverNow: number,
  locallyConnected = true,
) {
  const confirmed = Math.max(0, Number(room?.billableMs) || 0);
  if (
    !room ||
    !locallyConnected ||
    room.status !== 'active' ||
    !room.billingSince
  )
    return confirmed;
  const caller = room.billingReports?.[room.male?.uid || ''];
  const host = room.billingReports?.[room.female?.uid || ''];
  const checkpoint = Number(room.billingConfirmedAt);
  if (
    !caller?.connected ||
    !host?.connected ||
    !Number.isFinite(checkpoint) ||
    checkpoint <= 0
  )
    return confirmed;
  const leaseEndsAt =
    Math.min(caller.seenAt, host.seenAt) + CONNECTION_LEASE_MS;
  return confirmed + Math.max(0, Math.min(serverNow, leaseEndsAt) - checkpoint);
}
