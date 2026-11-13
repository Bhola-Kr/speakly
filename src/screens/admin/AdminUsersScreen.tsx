import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scopedDatabase as database } from '../../firebase/firebase';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../constants/colors';
import { useUser } from '../../hooks/UserContext';
import { CALL_RATE_PER_MINUTE } from '../../constants/constants';
import {
  processWithdrawalRequest,
  WithdrawalRequest,
} from '../../firebase/expertEarnings';
import {
  fetchExpertCompensationForAdmin,
  saveExpertCompensation,
  sendExpertApprovalNotification,
} from '../../api/calls';

type UserRecord = Record<string, any> & { uid?: string };
type ExpertApplication = {
  uid: string;
  applicantName?: string;
  applicantPhone?: string;
  status: 'pending' | 'approved' | 'rejected';
  language?: string;
  supportedLanguages?: string[];
  audioUrl?: string;
  prompt?: string;
  submittedAt?: number;
  reviewDueAt?: number;
};
type EditableUserFields = {
  gender: string;
  name: string;
  tamilName: string;
  voiceVerified: boolean;
  isExpert: boolean;
  birthYear: string;
  status: string;
  avatarId: string;
  balance: string;
  callRatePerMinute: string;
  expertCallRatePerMinute: string;
};
type ExpertActivity = {
  id: string;
  expertUid: string;
  expertName?: string;
  phone?: string;
  status: 'online' | 'offline' | 'active';
  callId?: string;
  createdAt: number;
};
type ExpertActivityGroup = {
  expertUid: string;
  expertName: string;
  phone: string;
  activities: ExpertActivity[];
  latestActivity: ExpertActivity;
};
type ExpertCallHistory = {
  id: string;
  callId: string;
  startedAt: number;
  endedAt?: number;
  duration: number;
  amount: number;
  status: string;
  maleInfo?: { name?: string };
  archivedAt?: number;
};
type DailyExpertSummary = {
  dateKey: string;
  dayStartedAt: number;
  onlineDuration: number;
  callsReceived: number;
  completedCalls: number;
  missedCalls: number;
  callDuration: number;
};

const DEFAULT_EXPERT_CALL_RATE_PER_MINUTE = 1;
const USER_PAGE_SIZE = 50;
const ADMIN_QUEUE_LIMIT = 100;
const ACTIVITY_OVERVIEW_LIMIT = 50;
const HISTORY_PAGE_SIZE = 50;
type UserCursor = { createdAt: number; uid: string };
type HistoryCursor = { startedAt: number; id: string };
const USER_STATUSES = ['online', 'offline', 'busy'] as const;
const formatDuration = (duration: number) => {
  const totalSeconds = Math.max(0, Math.floor(duration / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}h ${minutes}m`
    : minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;
};
const getOnlineDuration = (entries: ExpertActivity[]) => {
  const sorted = [...entries].sort(
    (a, b) => Number(a.createdAt) - Number(b.createdAt),
  );
  let onlineSince: number | null = null;
  let total = 0;
  const now = Date.now();

  sorted.forEach(entry => {
    if (entry.status === 'online' && onlineSince === null) {
      onlineSince = Number(entry.createdAt);
    } else if (entry.status === 'offline' && onlineSince !== null) {
      total += Math.max(0, Number(entry.createdAt) - onlineSince);
      onlineSince = null;
    }
  });

  if (onlineSince !== null) total += Math.max(0, now - onlineSince);
  return total;
};
const getLocalDayStart = (timestamp: number) => {
  const date = new Date(timestamp);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
};
const getLocalDateKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
};
const getCallTimestamp = (call: ExpertCallHistory) => {
  const endedAt = Number(call.endedAt || 0);
  const duration = Number(call.duration || 0);
  if (endedAt > 0 && duration > 0) return endedAt - duration;
  return endedAt || Number(call.startedAt || 0);
};
const getDailyExpertSummaries = (
  entries: ExpertActivity[],
  calls: ExpertCallHistory[],
) => {
  const summaries = new Map<string, DailyExpertSummary>();
  const ensureSummary = (timestamp: number) => {
    const dateKey = getLocalDateKey(timestamp);
    let summary = summaries.get(dateKey);
    if (!summary) {
      summary = {
        dateKey,
        dayStartedAt: getLocalDayStart(timestamp),
        onlineDuration: 0,
        callsReceived: 0,
        completedCalls: 0,
        missedCalls: 0,
        callDuration: 0,
      };
      summaries.set(dateKey, summary);
    }
    return summary;
  };
  const addOnlineInterval = (startedAt: number, endedAt: number) => {
    let cursor = startedAt;
    while (cursor < endedAt) {
      const dayStartedAt = getLocalDayStart(cursor);
      const nextDay = new Date(dayStartedAt);
      nextDay.setDate(nextDay.getDate() + 1);
      const intervalEnd = Math.min(endedAt, nextDay.getTime());
      ensureSummary(cursor).onlineDuration += intervalEnd - cursor;
      cursor = intervalEnd;
    }
  };

  const sortedEntries = [...entries].sort(
    (a, b) => Number(a.createdAt) - Number(b.createdAt),
  );
  let onlineSince: number | null = null;
  sortedEntries.forEach(entry => {
    const timestamp = Number(entry.createdAt || 0);
    if (!timestamp) return;
    ensureSummary(timestamp);
    if (entry.status === 'online' && onlineSince === null) {
      onlineSince = timestamp;
    } else if (entry.status === 'offline' && onlineSince !== null) {
      addOnlineInterval(onlineSince, timestamp);
      onlineSince = null;
    }
  });
  if (onlineSince !== null) addOnlineInterval(onlineSince, Date.now());

  calls.forEach(call => {
    const timestamp = getCallTimestamp(call);
    if (!timestamp) return;
    const summary = ensureSummary(timestamp);
    const completed = String(call.status).toLowerCase() === 'completed';
    summary.callsReceived += 1;
    summary.completedCalls += completed ? 1 : 0;
    summary.missedCalls += completed ? 0 : 1;
    summary.callDuration += Number(call.duration || 0);
  });

  return [...summaries.values()].sort(
    (a, b) => b.dayStartedAt - a.dayStartedAt,
  );
};
const readableError = (error: any, fallback: string) =>
  typeof error?.message === 'string' && error.message.trim()
    ? error.message
    : fallback;
const getCreatedAt = (user: UserRecord) => {
  const timestamp = Number(user.createdAt || 0);
  return Number.isFinite(timestamp) ? timestamp : 0;
};
const sortNewestUsersFirst = (records: UserRecord[]) =>
  [...records].sort((a, b) => getCreatedAt(b) - getCreatedAt(a));
const formatCreatedAt = (value: unknown) => {
  const timestamp = Number(value || 0);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 'Date unavailable';
  return new Date(timestamp).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const formatEarning = (value: unknown) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
const getUser = (snapshot: any): UserRecord | null => {
  const value = snapshot.val();
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...value, uid: snapshot.key || value.uid }
    : null;
};
const getPreferredLanguage = (user: UserRecord) =>
  (Array.isArray(user.profile?.supportedLanguages)
    ? user.profile.supportedLanguages
        .map((language: unknown) => String(language).trim())
        .filter(Boolean)
        .join(', ')
    : '') ||
  String(
    user.expertApplication?.language ||
      user.profile?.practiceLanguage ||
      user.profile?.nativeLanguage ||
      '',
  ).trim();
const matches = (user: UserRecord, query: string) =>
  [
    user.uid,
    user.phone,
    user.profile?.name,
    user.profile?.tamilName,
    getPreferredLanguage(user),
  ]
    .map(value => String(value || '').toLocaleLowerCase())
    .some(value => value.includes(query.trim().toLocaleLowerCase()));

export const AdminUsersScreen = ({ navigation }: any) => {
  const { user: currentUser } = useUser();
  const allowed = currentUser?.isAdmin || false;
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchResults, setSearchResults] = useState<UserRecord[]>([]);
  const [query, setQuery] = useState('');
  const [userCursor, setUserCursor] = useState<UserCursor | null>(null);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [loading, setLoading] = useState(allowed);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [adminTab, setAdminTab] = useState<
    'users' | 'activity' | 'withdrawals'
  >('users');
  const [expertHistoryRefreshKey, setExpertHistoryRefreshKey] = useState(0);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewingUid, setReviewingUid] = useState('');
  const [applications, setApplications] = useState<ExpertApplication[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [activities, setActivities] = useState<ExpertActivity[]>([]);
  const [selectedExpert, setSelectedExpert] =
    useState<ExpertActivityGroup | null>(null);
  const [expertHistoryTab, setExpertHistoryTab] = useState<
    'activity' | 'calls'
  >('activity');
  const [expertCallHistory, setExpertCallHistory] = useState<
    ExpertCallHistory[]
  >([]);
  const [loadingExpertHistory, setLoadingExpertHistory] = useState(false);
  const [loadingMoreExpertHistory, setLoadingMoreExpertHistory] =
    useState(false);
  const [expertHistoryCursor, setExpertHistoryCursor] =
    useState<HistoryCursor | null>(null);
  const [hasMoreExpertHistory, setHasMoreExpertHistory] = useState(false);
  const [expertHistoryError, setExpertHistoryError] = useState('');
  const [processingWithdrawal, setProcessingWithdrawal] = useState('');
  const [error, setError] = useState('');
  const [selectedUid, setSelectedUid] = useState('');
  const [editingUser, setEditingUser] = useState<EditableUserFields | null>(
    null,
  );
  const selectedExpertUid = selectedExpert?.expertUid || '';
  const isSearching = query.trim().length > 0;
  const displayedUsers = useMemo(
    () => (isSearching ? searchResults : users),
    [isSearching, searchResults, users],
  );
  const expertGroups = useMemo<ExpertActivityGroup[]>(() => {
    const groups = new Map<string, ExpertActivity[]>();
    activities.forEach(activity => {
      const entries = groups.get(activity.expertUid) || [];
      entries.push(activity);
      groups.set(activity.expertUid, entries);
    });

    users.forEach(user => {
      const expertUid = String(user.uid || '');
      const isExpert =
        user.isExpert === true || user.profile?.role === 'expert';
      if (!expertUid || !isExpert || groups.has(expertUid)) return;
      const fallbackActivity: ExpertActivity = {
        id: `profile-${expertUid}`,
        expertUid,
        expertName: String(
          user.profile?.name || user.profile?.tamilName || 'Host',
        ),
        phone: String(user.phone || user.profile?.phone || ''),
        status:
          user.profile?.status === 'online' || user.profile?.status === 'active'
            ? user.profile.status
            : 'offline',
        createdAt: Number(user.lastSeen || user.createdAt || 0),
      };
      groups.set(expertUid, [fallbackActivity]);
    });

    return [...groups.entries()]
      .map(([expertUid, entries]) => {
        const sorted = [...entries].sort(
          (a, b) => Number(b.createdAt) - Number(a.createdAt),
        );
        const latestActivity = sorted[0];
        return {
          expertUid,
          expertName: String(
            latestActivity.expertName ||
              sorted.find(entry => entry.expertName)?.expertName ||
              expertUid,
          ),
          phone: String(
            latestActivity.phone ||
              sorted.find(entry => entry.phone)?.phone ||
              expertUid,
          ),
          activities: entries,
          latestActivity,
        };
      })
      .sort(
        (a, b) =>
          Number(b.latestActivity.createdAt) -
          Number(a.latestActivity.createdAt),
      );
  }, [activities, users]);
  const dailyExpertSummaries = useMemo(
    () =>
      selectedExpert
        ? getDailyExpertSummaries(selectedExpert.activities, expertCallHistory)
        : [],
    [expertCallHistory, selectedExpert],
  );

  const loadUsers = useCallback(
    async (append = false) => {
      if (!allowed || (append && (!hasMoreUsers || loadingMore))) return;
      try {
        append ? setLoadingMore(true) : setLoading(true);
        setError('');
        let request = database().ref('users').orderByChild('createdAt');
        if (append && userCursor) {
          request = request.endAt(userCursor.createdAt, userCursor.uid);
        }
        const snapshot = await request
          .limitToLast(USER_PAGE_SIZE + 1)
          .once('value');
        const loaded: UserRecord[] = [];
        snapshot.forEach((child: any) => {
          const user = getUser(child);
          if (user) loaded.push(user);
          return false;
        });
        const withoutCursor =
          append && userCursor
            ? loaded.filter(user => String(user.uid) !== userCursor.uid)
            : loaded;
        const page = sortNewestUsersFirst(withoutCursor).slice(
          0,
          USER_PAGE_SIZE,
        );
        setUsers(previous => {
          if (!append) return page;
          const known = new Set(previous.map(user => String(user.uid)));
          return [
            ...previous,
            ...page.filter(user => !known.has(String(user.uid))),
          ];
        });
        const oldest = page[page.length - 1];
        setUserCursor(
          oldest
            ? { createdAt: getCreatedAt(oldest), uid: String(oldest.uid) }
            : null,
        );
        setHasMoreUsers(loaded.length === USER_PAGE_SIZE + 1);
      } catch (loadError: any) {
        setError(
          readableError(loadError, 'Unable to load users. Please try again.'),
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [allowed, hasMoreUsers, loadingMore, userCursor],
  );

  const refreshAdminData = async () => {
    if (refreshing) return;
    try {
      setRefreshing(true);
      setUserCursor(null);
      setHasMoreUsers(true);
      await loadUsers(false);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (allowed) loadUsers(false);
    // Pagination cursor changes must not restart the first page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    const withdrawalRef = database()
      .ref('withdrawalRequests')
      .orderByChild('status')
      .equalTo('pending')
      .limitToFirst(ADMIN_QUEUE_LIMIT);
    const withdrawalListener = withdrawalRef.on('value', snapshot => {
      const requests: WithdrawalRequest[] = [];
      snapshot.forEach((child: any) => {
        const value = child.val();
        if (value?.status === 'pending') {
          requests.push({ ...value, id: child.key || value.id });
        }
        return false;
      });
      requests.sort(
        (a, b) => Number(a.requestedAt || 0) - Number(b.requestedAt || 0),
      );
      setWithdrawals(requests);
    });

    const activityRef = database()
      .ref('expertActivityLatest')
      .orderByChild('createdAt')
      .limitToLast(ACTIVITY_OVERVIEW_LIMIT);
    const activityListener = activityRef.on('value', snapshot => {
      const entries: ExpertActivity[] = [];
      snapshot.forEach((expertSnapshot: any) => {
        const value = expertSnapshot.val();
        if (value?.status && value?.createdAt) {
          entries.push({
            ...value,
            id: value.id || expertSnapshot.key,
            expertUid: value.expertUid || expertSnapshot.key,
          });
        }
        return false;
      });
      entries.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      setActivities(entries);
    });

    return () => {
      withdrawalRef.off('value', withdrawalListener);
      activityRef.off('value', activityListener);
    };
  }, [allowed]);

  useEffect(() => {
    if (!selectedExpertUid) {
      setExpertCallHistory([]);
      setExpertHistoryError('');
      setExpertHistoryCursor(null);
      setHasMoreExpertHistory(false);
      return;
    }

    let active = true;
    const loadExpertHistory = async () => {
      setLoadingExpertHistory(true);
      setExpertHistoryError('');
      try {
        const [activitySnapshot, historySnapshot] = await Promise.all([
          database()
            .ref(`expertActivity/${selectedExpertUid}`)
            .orderByChild('createdAt')
            .limitToLast(ADMIN_QUEUE_LIMIT)
            .once('value'),
          database()
            .ref(`callHistory/${selectedExpertUid}`)
            .orderByChild('startedAt')
            .limitToLast(HISTORY_PAGE_SIZE + 1)
            .once('value'),
        ]);
        const recentActivities: ExpertActivity[] = [];
        activitySnapshot.forEach((child: any) => {
          const value = child.val();
          if (value?.createdAt) {
            recentActivities.push({
              ...value,
              id: child.key || value.id,
              expertUid: value.expertUid || selectedExpertUid,
            });
          }
          return false;
        });
        const history: ExpertCallHistory[] = [];
        historySnapshot.forEach((child: any) => {
          const value = child.val();
          if (value && !value.archivedAt) {
            history.push({
              ...value,
              id: child.key || value.callId,
            });
          }
          return false;
        });
        history.sort(
          (a, b) => Number(b.startedAt || 0) - Number(a.startedAt || 0),
        );
        const page = history.slice(0, HISTORY_PAGE_SIZE);
        const oldestCall = page[page.length - 1];
        if (active) {
          setExpertCallHistory(page);
          setHasMoreExpertHistory(history.length > HISTORY_PAGE_SIZE);
          setExpertHistoryCursor(
            oldestCall
              ? {
                  startedAt: Number(oldestCall.startedAt || 0),
                  id: oldestCall.id,
                }
              : null,
          );
          setSelectedExpert(current =>
            current
              ? {
                  ...current,
                  activities: recentActivities,
                }
              : current,
          );
        }
      } catch (loadError: any) {
        if (active) {
          setExpertHistoryError(
            readableError(
              loadError,
              'Unable to load this host’s call history.',
            ),
          );
        }
      } finally {
        if (active) setLoadingExpertHistory(false);
      }
    };

    loadExpertHistory();
    return () => {
      active = false;
    };
  }, [expertHistoryRefreshKey, selectedExpertUid]);

  const loadMoreExpertCalls = async () => {
    if (
      !selectedExpertUid ||
      !expertHistoryCursor ||
      !hasMoreExpertHistory ||
      loadingMoreExpertHistory
    ) {
      return;
    }
    try {
      setLoadingMoreExpertHistory(true);
      setExpertHistoryError('');
      const snapshot = await database()
        .ref(`callHistory/${selectedExpertUid}`)
        .orderByChild('startedAt')
        .endAt(expertHistoryCursor.startedAt, expertHistoryCursor.id)
        .limitToLast(HISTORY_PAGE_SIZE + 1)
        .once('value');
      const loaded: ExpertCallHistory[] = [];
      snapshot.forEach((child: any) => {
        const value = child.val();
        const id = child.key || value?.callId;
        if (value && !value.archivedAt && id !== expertHistoryCursor.id) {
          loaded.push({ ...value, id });
        }
        return false;
      });
      loaded.sort(
        (a, b) => Number(b.startedAt || 0) - Number(a.startedAt || 0),
      );
      const page = loaded.slice(0, HISTORY_PAGE_SIZE);
      setExpertCallHistory(previous => {
        const known = new Set(previous.map(call => call.id));
        return [...previous, ...page.filter(call => !known.has(call.id))];
      });
      const oldestCall = page[page.length - 1];
      setExpertHistoryCursor(
        oldestCall
          ? {
              startedAt: Number(oldestCall.startedAt || 0),
              id: oldestCall.id,
            }
          : null,
      );
      setHasMoreExpertHistory(snapshot.numChildren() === HISTORY_PAGE_SIZE + 1);
    } catch (loadError: any) {
      setExpertHistoryError(
        readableError(loadError, 'Unable to load older call history.'),
      );
    } finally {
      setLoadingMoreExpertHistory(false);
    }
  };

  const processWithdrawal = async (
    request: WithdrawalRequest,
    decision: 'paid' | 'rejected',
  ) => {
    if (processingWithdrawal) return;
    try {
      setProcessingWithdrawal(request.id);
      await processWithdrawalRequest(request, decision);
      Alert.alert(
        decision === 'paid' ? 'Payment Recorded' : 'Request Rejected',
        decision === 'paid'
          ? `₹${request.amount} was marked as manually paid.`
          : `₹${request.amount} was restored to the host's available earnings.`,
      );
    } catch (processError: any) {
      Alert.alert(
        'Unable to Process Request',
        readableError(processError, 'Please try again.'),
      );
    } finally {
      setProcessingWithdrawal('');
    }
  };

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    const ref = database()
      .ref('expertApplications')
      .orderByChild('status')
      .equalTo('pending')
      .limitToFirst(ADMIN_QUEUE_LIMIT);
    const listener = ref.on('value', async snapshot => {
      const pending: ExpertApplication[] = [];
      snapshot.forEach((child: any) => {
        const value = child.val();
        if (value?.status === 'pending') {
          pending.push({ ...value, uid: child.key || value.uid });
        }
        return false;
      });
      const enriched = await Promise.all(
        pending.map(async application => {
          let user: UserRecord = {};
          try {
            const userSnapshot = await database()
              .ref(`users/${application.uid}`)
              .once('value');
            user = userSnapshot.val() || {};
          } catch {
            // Keep the application visible with its UID if profile lookup fails.
          }
          return {
            ...application,
            applicantName: String(
              user.profile?.name || user.profile?.tamilName || '',
            ).trim(),
            applicantPhone: String(
              user.phone || user.profile?.phone || '',
            ).trim(),
          };
        }),
      );
      if (!active) return;
      enriched.sort(
        (a, b) => Number(a.submittedAt || 0) - Number(b.submittedAt || 0),
      );
      setApplications(enriched);
    });
    return () => {
      active = false;
      ref.off('value', listener);
    };
  }, [allowed]);

  useEffect(() => {
    const needle = query.trim();
    if (!allowed || !needle) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        setError('');
        const found = users.filter(user => matches(user, needle));
        const validFirebaseKey = !['.', '#', '$', '[', ']', '/'].some(
          character => needle.includes(character),
        );
        if (validFirebaseKey) {
          const exactSnapshot = await database()
            .ref(`users/${needle}`)
            .once('value');
          const exact = getUser(exactSnapshot);
          if (
            exact &&
            !found.some(user => String(user.uid) === String(exact.uid))
          ) {
            found.push(exact);
          }
        }
        if (!cancelled) setSearchResults(sortNewestUsersFirst(found));
      } catch (searchError: any) {
        if (!cancelled) {
          setSearchResults([]);
          setError(readableError(searchError, 'Unable to search users.'));
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [allowed, query, users]);

  const selectUser = async (item: UserRecord) => {
    const uid = String(item.uid || '');
    if (!uid) return setError('This record has no valid user ID.');
    let expertRate = DEFAULT_EXPERT_CALL_RATE_PER_MINUTE;
    if (item.isExpert === true) {
      try {
        const compensation = await fetchExpertCompensationForAdmin(uid);
        const configuredRate = Number(compensation.data.callRatePerMinute);
        if (Number.isFinite(configuredRate) && configuredRate > 0) {
          expertRate = configuredRate;
        }
      } catch (loadError) {
        console.warn('Unable to load expert compensation rate:', loadError);
      }
    }
    setSelectedUid(uid);
    const currentStatus = String(item.profile?.status ?? '').toLowerCase();
    setEditingUser({
      gender: String(item.profile?.gender ?? ''),
      name: String(item.profile?.name ?? ''),
      tamilName: String(item.profile?.tamilName ?? ''),
      voiceVerified: Boolean(item.verification?.voiceVerified),
      isExpert: item.isExpert === true,
      birthYear: String(item.profile?.birthYear ?? ''),
      status: USER_STATUSES.includes(
        currentStatus as (typeof USER_STATUSES)[number],
      )
        ? currentStatus
        : 'offline',
      avatarId: String(item.profile?.avatarId ?? ''),
      balance: String(item.wallet?.balance ?? ''),
      callRatePerMinute: String(item.profile?.price ?? CALL_RATE_PER_MINUTE),
      expertCallRatePerMinute: String(expertRate),
    });
    setError('');
  };
  const closeEditor = () => {
    if (!saving) {
      setSelectedUid('');
      setEditingUser(null);
    }
  };
  const updateField = <K extends keyof EditableUserFields>(
    field: K,
    value: EditableUserFields[K],
  ) =>
    setEditingUser(previous =>
      previous ? { ...previous, [field]: value } : previous,
    );

  const updateLocalUser = (uid: string, fields: EditableUserFields) => {
    const update = (user: UserRecord): UserRecord =>
      String(user.uid) !== uid
        ? user
        : {
            ...user,
            isExpert: fields.isExpert,
            profile: {
              ...(user.profile || {}),
              gender: fields.gender.trim(),
              name: fields.name.trim(),
              tamilName: fields.tamilName.trim(),
              birthYear: fields.birthYear,
              avatarId: Number.isFinite(Number(fields.avatarId))
                ? Number(fields.avatarId)
                : fields.avatarId.trim(),
              status: fields.status.trim(),
              price: Number(fields.callRatePerMinute),
            },
            verification: {
              ...(user.verification || {}),
              voiceVerified: fields.voiceVerified,
            },
            wallet: {
              ...(user.wallet || {}),
              balance: Number(fields.balance) || 0,
            },
          };
    setUsers(previous => previous.map(update));
    setSearchResults(previous => previous.map(update));
  };

  const saveUser = async () => {
    if (!selectedUid || !editingUser || saving) return;
    try {
      setSaving(true);
      setError('');
      const birthYear = editingUser.birthYear.trim();
      const year = Number(birthYear);
      const currentYear = new Date().getFullYear();
      if (
        birthYear &&
        (!Number.isInteger(year) || year < 1900 || year > currentYear)
      ) {
        throw new Error(`Birth year must be between 1900 and ${currentYear}.`);
      }
      const balance = editingUser.balance.trim()
        ? Number(editingUser.balance.trim())
        : 0;
      if (!Number.isFinite(balance))
        throw new Error('Balance must be a valid number.');
      const callRatePerMinute = Number(editingUser.callRatePerMinute.trim());
      if (!Number.isFinite(callRatePerMinute) || callRatePerMinute <= 0) {
        throw new Error('Call rate must be greater than zero.');
      }
      const expertCallRatePerMinute = Number(
        editingUser.expertCallRatePerMinute.trim(),
      );
      if (
        editingUser.isExpert &&
        (!Number.isFinite(expertCallRatePerMinute) ||
          expertCallRatePerMinute <= 0)
      ) {
        throw new Error('Host earning rate must be greater than zero.');
      }
      const avatarText = editingUser.avatarId.trim();
      const avatarId =
        avatarText && Number.isFinite(Number(avatarText))
          ? Number(avatarText)
          : avatarText;
      const normalized = {
        ...editingUser,
        birthYear,
        balance: String(balance),
        callRatePerMinute: String(callRatePerMinute),
        expertCallRatePerMinute: String(expertCallRatePerMinute),
        avatarId: String(avatarId),
      };
      await database()
        .ref()
        .update({
          [`users/${selectedUid}/profile/gender`]: editingUser.gender.trim(),
          [`users/${selectedUid}/profile/name`]: editingUser.name.trim(),
          [`users/${selectedUid}/profile/tamilName`]:
            editingUser.tamilName.trim(),
          [`users/${selectedUid}/profile/birthYear`]: birthYear,
          [`users/${selectedUid}/profile/avatarId`]: avatarId,
          [`users/${selectedUid}/profile/status`]: editingUser.status.trim(),
          [`users/${selectedUid}/profile/price`]: callRatePerMinute,
          [`users/${selectedUid}/isExpert`]: editingUser.isExpert,
          [`users/${selectedUid}/verification/voiceVerified`]:
            editingUser.voiceVerified,
          [`users/${selectedUid}/wallet/balance`]: balance,
        });
      if (editingUser.isExpert) {
        await saveExpertCompensation(selectedUid, expertCallRatePerMinute);
      }
      updateLocalUser(selectedUid, normalized);
      setEditingUser(normalized);
      Alert.alert('Saved', 'The user was updated successfully.');
    } catch (saveError: any) {
      const message = readableError(saveError, 'Unable to update this user.');
      setError(message);
      Alert.alert('Update Failed', message);
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = () => {
    if (!selectedUid || saving) return;
    const uid = selectedUid;
    Alert.alert(
      'Delete User Data',
      `Permanently delete database data for ${uid}? This cannot be undone. The Firebase Authentication account is not deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await database()
                .ref()
                .update({
                  [`users/${uid}`]: null,
                  [`rooms/${uid}`]: null,
                  [`callHistory/${uid}`]: null,
                });
              setUsers(previous =>
                previous.filter(user => String(user.uid) !== uid),
              );
              setSearchResults(previous =>
                previous.filter(user => String(user.uid) !== uid),
              );
              setSelectedUid('');
              setEditingUser(null);
            } catch (deleteError: any) {
              const message = readableError(
                deleteError,
                'Unable to delete this user.',
              );
              setError(message);
              Alert.alert('Delete Failed', message);
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const reviewApplication = async (
    application: ExpertApplication,
    decision: 'approved' | 'rejected',
  ) => {
    if (!application.uid || reviewingUid) return;
    try {
      setReviewingUid(application.uid);
      const now = Date.now();
      const approved = decision === 'approved';
      const reviewed = {
        ...application,
        status: decision,
        reviewedAt: now,
        reviewedBy: String(currentUser?.uid || ''),
        updatedAt: now,
      };
      await database()
        .ref()
        .update({
          [`expertApplications/${application.uid}`]: reviewed,
          [`users/${application.uid}/expertApplication`]: reviewed,
          [`users/${application.uid}/isExpert`]: approved,
          [`users/${application.uid}/profile/role`]: approved
            ? 'expert'
            : 'learner',
          [`users/${application.uid}/verification/voiceVerified`]: approved,
          [`users/${application.uid}/settings/voiceCallsEnabled`]: approved,
        });
      if (approved) {
        const notification = await sendExpertApprovalNotification(
          application.uid,
        ).catch(notificationError => {
          console.warn('Unable to notify approved expert:', notificationError);
          return null;
        });
        Alert.alert(
          "You're Approved!",
          notification?.delivered
            ? 'The user now has host access and was notified.'
            : 'The user now has host access, but no notification could be delivered. Ask them to open Speakly 121 and allow notifications.',
        );
        return;
      }
      Alert.alert(
        'Application Rejected',
        'The user can continue using Speakly 121 as a caller.',
      );
    } catch (reviewError: any) {
      Alert.alert(
        'Review Failed',
        readableError(reviewError, 'Unable to update this application.'),
      );
    } finally {
      setReviewingUid('');
    }
  };

  const renderApplications = () => (
    <View style={styles.reviewSection}>
      <View style={styles.reviewHeadingRow}>
        <Text style={styles.reviewHeading}>Host applications</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{applications.length}</Text>
        </View>
      </View>
      {applications.length === 0 ? (
        <Text style={styles.noApplications}>
          No applications awaiting review.
        </Text>
      ) : (
        applications.map(application => {
          const overdue = Number(application.reviewDueAt || 0) < Date.now();
          const busy = reviewingUid === application.uid;
          return (
            <View key={application.uid} style={styles.applicationCard}>
              <View style={styles.applicationTopRow}>
                <View style={styles.userCopy}>
                  <Text style={styles.applicationUid} numberOfLines={1}>
                    {application.applicantName || 'Unnamed applicant'}
                  </Text>
                  <Text style={styles.applicationPhone} numberOfLines={1}>
                    {application.applicantPhone || application.uid}
                  </Text>
                  <Text style={styles.applicationMeta}>
                    {(
                      application.supportedLanguages || [
                        application.language || 'Unknown language',
                      ]
                    ).join(', ')}{' '}
                    · {overdue ? 'Review overdue' : 'Within review window'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.listenButton}
                  onPress={() =>
                    application.audioUrl
                      ? Linking.openURL(application.audioUrl)
                      : Alert.alert('Audio unavailable')
                  }
                >
                  <MaterialCommunityIcons
                    name="play-circle"
                    size={24}
                    color={Colors.secondary}
                  />
                  <Text style={styles.listenText}>Listen</Text>
                </TouchableOpacity>
              </View>
              {!!application.prompt && (
                <Text style={styles.applicationPrompt} numberOfLines={3}>
                  {application.prompt}
                </Text>
              )}
              <View style={styles.reviewActions}>
                <TouchableOpacity
                  disabled={busy}
                  style={styles.rejectButton}
                  onPress={() => reviewApplication(application, 'rejected')}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={busy}
                  style={styles.approveButton}
                  onPress={() => reviewApplication(application, 'approved')}
                >
                  {busy ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.approveButtonText}>Approve host</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  const renderWithdrawals = () => (
    <View style={styles.reviewSection}>
      <View style={styles.reviewHeadingRow}>
        <Text style={styles.reviewHeading}>Withdrawal requests</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{withdrawals.length}</Text>
        </View>
      </View>
      {withdrawals.length === 0 ? (
        <Text style={styles.noApplications}>
          No withdrawals awaiting payment.
        </Text>
      ) : (
        withdrawals.map(request => {
          const busy = processingWithdrawal === request.id;
          return (
            <View key={request.id} style={styles.applicationCard}>
              <Text style={styles.applicationUid}>{request.expertName}</Text>
              <Text style={styles.applicationPhone}>
                {request.phone || request.expertUid}
              </Text>
              <Text style={styles.withdrawalAmount}>₹{request.amount}</Text>
              <Text style={styles.applicationMeta}>
                Requested{' '}
                {new Date(request.requestedAt).toLocaleString('en-IN')}
              </Text>
              <View style={styles.reviewActions}>
                <TouchableOpacity
                  disabled={busy}
                  style={styles.rejectButton}
                  onPress={() => processWithdrawal(request, 'rejected')}
                >
                  <Text style={styles.rejectButtonText}>Reject & restore</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={busy}
                  style={styles.approveButton}
                  onPress={() => processWithdrawal(request, 'paid')}
                >
                  {busy ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.approveButtonText}>Mark paid</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  const renderExpertActivity = () => (
    <View style={styles.reviewSection}>
      <View style={styles.reviewHeadingRow}>
        <Text style={styles.reviewHeading}>Host activity history</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{expertGroups.length}</Text>
        </View>
      </View>
      {expertGroups.length === 0 ? (
        <Text style={styles.noApplications}>
          No activity has been recorded yet.
        </Text>
      ) : (
        expertGroups.map(expert => (
          <TouchableOpacity
            key={expert.expertUid}
            accessibilityRole="button"
            style={styles.activityRow}
            onPress={() => {
              setExpertHistoryTab('activity');
              setSelectedExpert(expert);
            }}
          >
            <View
              style={[
                styles.activityDot,
                expert.latestActivity.status === 'online' &&
                  styles.activityOnline,
                expert.latestActivity.status === 'active' &&
                  styles.activityActive,
              ]}
            />
            <View style={styles.activityCopy}>
              <Text style={styles.activityName} numberOfLines={1}>
                {expert.expertName}
              </Text>
              <Text style={styles.activityMeta} numberOfLines={1}>
                {expert.phone} · {expert.latestActivity.status} ·{' '}
                {expert.activities.length} events
              </Text>
            </View>
            <Text style={styles.activityTime}>
              {new Date(expert.latestActivity.createdAt).toLocaleString(
                'en-IN',
                {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                },
              )}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={Colors.placeholder}
            />
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  if (!allowed)
    return (
      <SafeAreaView style={styles.centered}>
        <MaterialCommunityIcons
          name="shield-lock"
          size={52}
          color={Colors.danger}
        />
        <Text style={styles.deniedTitle}>Access denied</Text>
        <Text style={styles.deniedText}>
          This account is not configured as an administrator.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );

  const renderUser = ({ item }: { item: UserRecord }) => {
    const uid = String(item.uid || '');
    const name = String(
      item.profile?.name || item.profile?.tamilName || 'Unnamed user',
    );
    const preferredLanguage = getPreferredLanguage(item);
    const isExpertAccount =
      item.isExpert === true ||
      item.profile?.role === 'expert' ||
      Boolean(item.expertApplication);
    const availableEarnings = formatEarning(item.expertEarnings?.available);
    const totalEarnings = formatEarning(item.expertEarnings?.total);
    return (
      <TouchableOpacity style={styles.userRow} onPress={() => selectUser(item)}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {name.trim().charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.userCopy}>
          <Text style={styles.userName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.userMeta} numberOfLines={1}>
            {String(item.phone || uid)}
          </Text>
          <Text style={styles.userCreated} numberOfLines={1}>
            Joined {formatCreatedAt(item.createdAt)}
          </Text>
          {isExpertAccount && preferredLanguage ? (
            <Text style={styles.userLanguage} numberOfLines={1}>
              Host language: {preferredLanguage}
            </Text>
          ) : null}
          {isExpertAccount ? (
            <Text style={styles.userEarnings} numberOfLines={1}>
              Earnings: ₹{availableEarnings} available · ₹{totalEarnings} total
            </Text>
          ) : null}
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={23}
          color={Colors.placeholder}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={25}
            color={Colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Users</Text>
        <TouchableOpacity
          disabled={refreshing}
          onPress={refreshAdminData}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Refresh admin data"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={Colors.secondary} />
          ) : (
            <MaterialCommunityIcons
              name="refresh"
              size={25}
              color={Colors.secondary}
            />
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.adminTabs} accessibilityRole="tablist">
        {(
          [
            { id: 'users', label: 'Users', count: applications.length },
            { id: 'activity', label: 'Activity', count: 0 },
            {
              id: 'withdrawals',
              label: 'Withdrawals',
              count: withdrawals.length,
            },
          ] as const
        ).map(tab => (
          <TouchableOpacity
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: adminTab === tab.id }}
            accessibilityLabel={`${tab.label}${
              tab.count ? `, ${tab.count} pending` : ''
            }`}
            activeOpacity={0.85}
            onPress={() => setAdminTab(tab.id)}
            style={[
              styles.adminTab,
              adminTab === tab.id && styles.adminTabSelected,
            ]}
          >
            <Text
              style={[
                styles.adminTabText,
                adminTab === tab.id && styles.adminTabTextSelected,
              ]}
            >
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        key={adminTab}
        data={adminTab === 'users' ? displayedUsers : []}
        keyExtractor={item => String(item.uid)}
        renderItem={renderUser}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        onEndReached={() => {
          if (adminTab === 'users' && !isSearching) loadUsers(true);
        }}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={
          <>
            {adminTab === 'withdrawals' && renderWithdrawals()}
            {adminTab === 'activity' && renderExpertActivity()}
            {adminTab === 'users' && (
              <>
                {renderApplications()}
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search all users..."
                  placeholderTextColor={Colors.placeholder}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <View style={styles.resultInfo}>
                  <Text style={styles.resultText}>
                    {isSearching
                      ? `${displayedUsers.length} matches`
                      : `${users.length} users loaded`}
                  </Text>
                  {searching ? (
                    <ActivityIndicator size="small" color={Colors.secondary} />
                  ) : null}
                </View>
              </>
            )}
          </>
        }
        ListEmptyComponent={
          adminTab !== 'users' ? null : loading || searching ? (
            <ActivityIndicator color={Colors.secondary} style={styles.loader} />
          ) : (
            <Text style={styles.empty}>
              {isSearching ? 'No users found.' : 'No users available.'}
            </Text>
          )
        }
        ListFooterComponent={
          adminTab !== 'users' ? null : loadingMore ? (
            <ActivityIndicator
              color={Colors.secondary}
              style={styles.footerLoader}
            />
          ) : !isSearching && users.length > 0 && !hasMoreUsers ? (
            <Text style={styles.endText}>All users loaded</Text>
          ) : null
        }
      />

      <Modal
        visible={Boolean(selectedUid && editingUser)}
        animationType="slide"
        onRequestClose={closeEditor}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={closeEditor}
                disabled={saving}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={26}
                  color={Colors.text}
                />
              </TouchableOpacity>
              <View style={styles.modalTitleCopy}>
                <Text style={styles.editorTitle}>Edit User</Text>
                <Text style={styles.uidText} numberOfLines={1}>
                  {selectedUid}
                </Text>
              </View>
              <View style={styles.iconButton} />
            </View>
            {editingUser ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.editorContent}
              >
                <Text style={styles.sectionTitle}>Profile</Text>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  value={editingUser.name}
                  onChangeText={value => updateField('name', value)}
                  style={styles.input}
                  placeholder="Name"
                  placeholderTextColor={Colors.placeholder}
                />
                <Text style={styles.label}>Tamil Name</Text>
                <TextInput
                  value={editingUser.tamilName}
                  onChangeText={value => updateField('tamilName', value)}
                  style={styles.input}
                  placeholder="Tamil name"
                  placeholderTextColor={Colors.placeholder}
                />
                <Text style={styles.label}>Gender</Text>
                <TextInput
                  value={editingUser.gender}
                  onChangeText={value => updateField('gender', value)}
                  style={styles.input}
                  placeholder="Gender"
                  placeholderTextColor={Colors.placeholder}
                />
                <Text style={styles.label}>Birth Year</Text>
                <TextInput
                  value={editingUser.birthYear}
                  onChangeText={value =>
                    updateField('birthYear', value.replace(/[^0-9]/g, ''))
                  }
                  style={styles.input}
                  placeholder="e.g. 1995"
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <Text style={styles.label}>Avatar ID</Text>
                <TextInput
                  value={editingUser.avatarId}
                  onChangeText={value =>
                    updateField('avatarId', value.replace(/[^0-9]/g, ''))
                  }
                  style={styles.input}
                  placeholder="e.g. 1"
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="number-pad"
                />
                <Text style={styles.label}>Status</Text>
                <View style={styles.statusOptions}>
                  {USER_STATUSES.map(status => {
                    const selected = editingUser.status === status;
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusOption,
                          selected && styles.statusOptionSelected,
                        ]}
                        onPress={() => updateField('status', status)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <Text
                          style={[
                            styles.statusOptionText,
                            selected && styles.statusOptionTextSelected,
                          ]}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.sectionTitle}>Verification</Text>
                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.switchTitle}>Host access</Text>
                    <Text style={styles.switchHelp}>
                      Experts can go online and receive paid calls.
                    </Text>
                  </View>
                  <Switch
                    value={editingUser.isExpert}
                    onValueChange={value => updateField('isExpert', value)}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                  />
                </View>
                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.switchTitle}>Voice Verified</Text>
                    <Text style={styles.switchHelp}>
                      Mark this user's voice verification status.
                    </Text>
                  </View>
                  <Switch
                    value={editingUser.voiceVerified}
                    onValueChange={value => updateField('voiceVerified', value)}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                  />
                </View>
                <Text style={styles.sectionTitle}>My Coins</Text>
                <Text style={styles.label}>
                  User charge rate (coins per minute)
                </Text>
                <TextInput
                  value={editingUser.callRatePerMinute}
                  onChangeText={value =>
                    updateField(
                      'callRatePerMinute',
                      value.replace(/[^0-9.]/g, ''),
                    )
                  }
                  style={styles.input}
                  placeholder={String(CALL_RATE_PER_MINUTE)}
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="decimal-pad"
                />
                {editingUser.isExpert && (
                  <>
                    <Text style={styles.label}>
                      Host earning rate (₹ per minute)
                    </Text>
                    <TextInput
                      value={editingUser.expertCallRatePerMinute}
                      onChangeText={value =>
                        updateField(
                          'expertCallRatePerMinute',
                          value.replace(/[^0-9.]/g, ''),
                        )
                      }
                      style={styles.input}
                      placeholder={String(DEFAULT_EXPERT_CALL_RATE_PER_MINUTE)}
                      placeholderTextColor={Colors.placeholder}
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.switchHelp}>
                      Private payout rate. Only the host and administrators can
                      see it.
                    </Text>
                  </>
                )}
                <Text style={styles.label}>Balance</Text>
                <TextInput
                  value={editingUser.balance}
                  onChangeText={value =>
                    updateField('balance', value.replace(/[^0-9.-]/g, ''))
                  }
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  disabled={saving}
                  style={[
                    styles.primaryButton,
                    saving && styles.buttonDisabled,
                  ]}
                  onPress={saveUser}
                >
                  {saving ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={saving}
                  style={[styles.deleteButton, saving && styles.buttonDisabled]}
                  onPress={deleteUser}
                >
                  <Text style={styles.deleteText}>Delete User Data</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={Boolean(selectedExpert)}
        animationType="slide"
        onRequestClose={() => setSelectedExpert(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setSelectedExpert(null)}
              accessibilityRole="button"
              accessibilityLabel="Close host history"
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={25}
                color={Colors.text}
              />
            </TouchableOpacity>
            <View style={styles.modalTitleCopy}>
              <Text style={styles.editorTitle}>Host history</Text>
            </View>
            <TouchableOpacity
              disabled={loadingExpertHistory}
              style={styles.iconButton}
              onPress={() => setExpertHistoryRefreshKey(key => key + 1)}
              accessibilityRole="button"
              accessibilityLabel="Refresh host history"
            >
              {loadingExpertHistory ? (
                <ActivityIndicator size="small" color={Colors.secondary} />
              ) : (
                <MaterialCommunityIcons
                  name="refresh"
                  size={24}
                  color={Colors.secondary}
                />
              )}
            </TouchableOpacity>
          </View>
          {selectedExpert ? (
            <ScrollView
              contentContainerStyle={styles.expertHistoryContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.expertSummaryCard}>
                <Text style={styles.expertSummaryName}>
                  {selectedExpert.expertName}
                </Text>
                <Text style={styles.expertSummaryPhone}>
                  {selectedExpert.phone}
                </Text>
                <View style={styles.expertStatsRow}>
                  <View style={styles.expertStat}>
                    <Text style={styles.expertStatValue}>
                      {expertCallHistory.length}
                    </Text>
                    <Text style={styles.expertStatLabel}>Total calls</Text>
                  </View>
                  <View style={styles.expertStat}>
                    <Text style={styles.expertStatValue}>
                      {formatDuration(
                        expertCallHistory.reduce(
                          (total, call) => total + Number(call.duration || 0),
                          0,
                        ),
                      )}
                    </Text>
                    <Text style={styles.expertStatLabel}>Call time</Text>
                  </View>
                  <View style={styles.expertStat}>
                    <Text style={styles.expertStatValue}>
                      {formatDuration(
                        getOnlineDuration(selectedExpert.activities),
                      )}
                    </Text>
                    <Text style={styles.expertStatLabel}>Online time</Text>
                  </View>
                </View>
              </View>

              <View
                accessibilityRole="tablist"
                style={styles.expertHistoryTabs}
              >
                <TouchableOpacity
                  accessibilityRole="tab"
                  accessibilityState={{
                    selected: expertHistoryTab === 'activity',
                  }}
                  activeOpacity={0.82}
                  onPress={() => setExpertHistoryTab('activity')}
                  style={[
                    styles.expertHistoryTab,
                    expertHistoryTab === 'activity' &&
                      styles.expertHistoryTabSelected,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="calendar-clock-outline"
                    size={18}
                    color={
                      expertHistoryTab === 'activity'
                        ? Colors.white
                        : Colors.subText
                    }
                  />
                  <Text
                    style={[
                      styles.expertHistoryTabText,
                      expertHistoryTab === 'activity' &&
                        styles.expertHistoryTabTextSelected,
                    ]}
                  >
                    Daily Activity
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="tab"
                  accessibilityState={{
                    selected: expertHistoryTab === 'calls',
                  }}
                  activeOpacity={0.82}
                  onPress={() => setExpertHistoryTab('calls')}
                  style={[
                    styles.expertHistoryTab,
                    expertHistoryTab === 'calls' &&
                      styles.expertHistoryTabSelected,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="phone-clock-outline"
                    size={18}
                    color={
                      expertHistoryTab === 'calls'
                        ? Colors.white
                        : Colors.subText
                    }
                  />
                  <Text
                    style={[
                      styles.expertHistoryTabText,
                      expertHistoryTab === 'calls' &&
                        styles.expertHistoryTabTextSelected,
                    ]}
                  >
                    Call History
                  </Text>
                </TouchableOpacity>
              </View>

              {expertHistoryTab === 'activity' ? (
                <>
                  <Text style={styles.expertHistoryHeading}>
                    Daily activity
                  </Text>
                  {loadingExpertHistory ? (
                    <ActivityIndicator
                      color={Colors.secondary}
                      style={styles.expertHistoryLoader}
                    />
                  ) : dailyExpertSummaries.length === 0 ? (
                    <Text style={styles.noApplications}>
                      No daily activity is available for this host.
                    </Text>
                  ) : (
                    dailyExpertSummaries.map(day => (
                      <View key={day.dateKey} style={styles.dailyActivityCard}>
                        <Text style={styles.dailyActivityDate}>
                          {new Date(day.dayStartedAt).toLocaleDateString(
                            'en-IN',
                            {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            },
                          )}
                        </Text>
                        <View style={styles.dailyStatsRow}>
                          <View style={styles.dailyStat}>
                            <Text style={styles.dailyStatValue}>
                              {formatDuration(day.onlineDuration)}
                            </Text>
                            <Text style={styles.dailyStatLabel}>Active</Text>
                          </View>
                          <View style={styles.dailyStat}>
                            <Text style={styles.dailyStatValue}>
                              {day.callsReceived}
                            </Text>
                            <Text style={styles.dailyStatLabel}>Received</Text>
                          </View>
                          <View style={styles.dailyStat}>
                            <Text style={styles.dailyStatValue}>
                              {day.completedCalls}
                            </Text>
                            <Text style={styles.dailyStatLabel}>Completed</Text>
                          </View>
                          <View style={styles.dailyStat}>
                            <Text style={styles.dailyStatValue}>
                              {day.missedCalls}
                            </Text>
                            <Text style={styles.dailyStatLabel}>Missed</Text>
                          </View>
                        </View>
                        <Text style={styles.dailyCallTime}>
                          Total call time: {formatDuration(day.callDuration)}
                        </Text>
                      </View>
                    ))
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.expertHistoryHeading}>Call history</Text>
                  {loadingExpertHistory ? (
                    <ActivityIndicator
                      color={Colors.secondary}
                      style={styles.expertHistoryLoader}
                    />
                  ) : expertHistoryError ? (
                    <Text style={styles.error}>{expertHistoryError}</Text>
                  ) : expertCallHistory.length === 0 ? (
                    <Text style={styles.noApplications}>
                      No call history is available for this host.
                    </Text>
                  ) : (
                    expertCallHistory.map(call => (
                      <View key={call.id} style={styles.expertCallCard}>
                        <View style={styles.expertCallCopy}>
                          <Text style={styles.expertCallName} numberOfLines={1}>
                            {call.maleInfo?.name || 'Caller'}
                          </Text>
                          <Text style={styles.expertCallMeta}>
                            {call.startedAt
                              ? new Date(call.startedAt).toLocaleString(
                                  'en-IN',
                                  {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  },
                                )
                              : 'Date unavailable'}
                          </Text>
                        </View>
                        <View style={styles.expertCallDetails}>
                          <Text style={styles.expertCallDuration}>
                            {formatDuration(Number(call.duration || 0))}
                          </Text>
                          <Text style={styles.expertCallStatus}>
                            {call.status || 'Unknown'}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                  {hasMoreExpertHistory ? (
                    <TouchableOpacity
                      disabled={loadingMoreExpertHistory}
                      style={styles.loadMoreButton}
                      onPress={loadMoreExpertCalls}
                    >
                      {loadingMoreExpertHistory ? (
                        <ActivityIndicator color={Colors.secondary} />
                      ) : (
                        <Text style={styles.loadMoreText}>
                          Load older calls
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </>
              )}
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modalTitleCopy: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text },
  adminTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 4,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adminTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  adminTabSelected: { backgroundColor: Colors.primary },
  adminTabText: { color: Colors.subText, fontSize: 12, fontWeight: '700' },
  adminTabTextSelected: { color: Colors.white },
  tabBadge: {
    marginLeft: 4,
    paddingHorizontal: 5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  tabBadgeText: { color: Colors.primary, fontSize: 10, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingBottom: 60, flexGrow: 1 },
  reviewSection: { marginTop: 8, marginBottom: 20 },
  reviewHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewHeading: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  countBadge: {
    marginLeft: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: Colors.white, fontSize: 12, fontWeight: '800' },
  noApplications: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.white,
    color: Colors.subText,
    fontSize: 13,
  },
  applicationCard: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  applicationTopRow: { flexDirection: 'row', alignItems: 'center' },
  applicationUid: { color: Colors.text, fontSize: 14, fontWeight: '800' },
  applicationPhone: {
    marginTop: 2,
    color: Colors.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  applicationMeta: { marginTop: 3, color: Colors.subText, fontSize: 12 },
  withdrawalAmount: {
    marginTop: 8,
    color: Colors.text,
    fontSize: 25,
    fontWeight: '900',
  },
  activityRow: {
    minHeight: 64,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
    backgroundColor: Colors.placeholder,
  },
  activityOnline: { backgroundColor: Colors.success },
  activityActive: { backgroundColor: Colors.secondary },
  activityCopy: { flex: 1, minWidth: 0 },
  activityName: { color: Colors.text, fontSize: 14, fontWeight: '800' },
  activityMeta: { marginTop: 3, color: Colors.subText, fontSize: 12 },
  activityTime: {
    maxWidth: 88,
    marginLeft: 8,
    color: Colors.subText,
    fontSize: 10,
    textAlign: 'right',
  },
  expertHistoryContent: { padding: 16, paddingBottom: 40 },
  expertSummaryCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expertSummaryName: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  expertSummaryPhone: {
    marginTop: 4,
    color: Colors.subText,
    fontSize: 14,
  },
  expertStatsRow: {
    marginTop: 18,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: 14,
  },
  expertStat: { flex: 1, alignItems: 'center', paddingHorizontal: 3 },
  expertStatValue: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  expertStatLabel: {
    marginTop: 4,
    color: Colors.subText,
    fontSize: 11,
    textAlign: 'center',
  },
  expertHistoryTabs: {
    flexDirection: 'row',
    marginTop: 16,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  expertHistoryTab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
  },
  expertHistoryTabSelected: {
    backgroundColor: Colors.secondary,
  },
  expertHistoryTabText: {
    color: Colors.subText,
    fontSize: 13,
    fontWeight: '800',
  },
  expertHistoryTabTextSelected: {
    color: Colors.white,
  },
  expertHistoryHeading: {
    marginTop: 16,
    marginBottom: 10,
    color: Colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  expertHistoryLoader: { marginVertical: 28 },
  loadMoreButton: {
    minHeight: 44,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: { color: Colors.secondary, fontSize: 13, fontWeight: '800' },
  dailyActivityCard: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dailyActivityDate: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  dailyStatsRow: {
    marginTop: 13,
    flexDirection: 'row',
  },
  dailyStat: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  dailyStatValue: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  dailyStatLabel: {
    marginTop: 3,
    color: Colors.subText,
    fontSize: 10,
    textAlign: 'center',
  },
  dailyCallTime: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    color: Colors.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  expertCallCard: {
    minHeight: 70,
    marginBottom: 9,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expertCallCopy: { flex: 1, minWidth: 0 },
  expertCallName: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  expertCallMeta: { marginTop: 4, color: Colors.subText, fontSize: 11 },
  expertCallDetails: { alignItems: 'flex-end', marginLeft: 10 },
  expertCallDuration: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  expertCallStatus: { marginTop: 3, color: Colors.subText, fontSize: 11 },
  listenButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  listenText: { color: Colors.secondary, fontSize: 13, fontWeight: '800' },
  applicationPrompt: {
    marginTop: 12,
    color: Colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  reviewActions: { marginTop: 14, flexDirection: 'row', gap: 10 },
  rejectButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: { color: Colors.danger, fontSize: 13, fontWeight: '800' },
  approveButton: {
    flex: 1.4,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButtonText: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  searchInput: {
    height: 52,
    marginTop: 6,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 15,
    color: Colors.text,
    fontSize: 14,
  },
  error: {
    color: Colors.danger,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  resultInfo: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  resultText: { color: Colors.subText, fontSize: 13, fontWeight: '600' },
  loader: { marginTop: 35 },
  footerLoader: { marginVertical: 20 },
  endText: {
    textAlign: 'center',
    color: Colors.subText,
    fontSize: 13,
    marginVertical: 20,
  },
  userRow: {
    minHeight: 88,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  userCopy: { flex: 1, minWidth: 0 },
  userName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  userMeta: { color: Colors.subText, fontSize: 12 },
  userCreated: {
    marginTop: 3,
    color: Colors.subText,
    fontSize: 11,
  },
  userLanguage: {
    marginTop: 3,
    color: Colors.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  userEarnings: {
    marginTop: 3,
    color: Colors.coinHighlight,
    fontSize: 12,
    fontWeight: '800',
  },
  empty: {
    color: Colors.subText,
    textAlign: 'center',
    paddingVertical: 36,
    fontSize: 14,
  },
  editorContent: { padding: 20, paddingBottom: 80 },
  editorTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  uidText: { color: Colors.subText, fontSize: 11, marginTop: 2, maxWidth: 250 },
  sectionTitle: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  label: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: Colors.text,
    fontSize: 14,
    marginBottom: 15,
  },
  statusOptions: { flexDirection: 'row', marginBottom: 15, gap: 8 },
  statusOption: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  statusOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  statusOptionText: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  statusOptionTextSelected: { color: Colors.white },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  switchCopy: { flex: 1, paddingRight: 14 },
  switchTitle: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  switchHelp: {
    color: Colors.subText,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
  },
  primaryButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  deleteButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 14,
  },
  deleteText: { color: Colors.danger, fontSize: 14, fontWeight: '700' },
  buttonDisabled: { opacity: 0.55 },
  deniedTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 15,
  },
  deniedText: {
    color: Colors.subText,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
});
