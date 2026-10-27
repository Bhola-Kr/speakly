import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform,
  SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { scopedDatabase as database } from '../../firebase/firebase';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../constants/colors';
import { useUser } from '../../hooks/UserContext';

type UserRecord = Record<string, any> & { uid?: string };
type EditableUserFields = {
  gender: string; name: string; tamilName: string; voiceVerified: boolean;
  birthYear: string; status: string; avatarId: string; balance: string;
};

const PAGE_SIZE = 25;
const USER_STATUSES = ['online', 'offline', 'busy'] as const;
const readableError = (error: any, fallback: string) =>
  typeof error?.message === 'string' && error.message.trim() ? error.message : fallback;
const getUser = (snapshot: any): UserRecord | null => {
  const value = snapshot.val();
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...value, uid: snapshot.key || value.uid }
    : null;
};
const matches = (user: UserRecord, query: string) =>
  [user.uid, user.phone, user.profile?.name, user.profile?.tamilName]
    .map(value => String(value || '').toLocaleLowerCase())
    .some(value => value.includes(query.trim().toLocaleLowerCase()));

export const AdminUsersScreen = ({ navigation }: any) => {
  const { user: currentUser } = useUser();
  const allowed = currentUser?.isAdmin || false;
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchResults, setSearchResults] = useState<UserRecord[]>([]);
  const [query, setQuery] = useState('');
  const [lastUid, setLastUid] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(allowed);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedUid, setSelectedUid] = useState('');
  const [editingUser, setEditingUser] = useState<EditableUserFields | null>(null);
  const isSearching = query.trim().length > 0;
  const displayedUsers = useMemo(
    () => (isSearching ? searchResults : users),
    [isSearching, searchResults, users],
  );

  const loadUsers = useCallback(async (append = false) => {
    if (!allowed || (append && (!hasMore || loadingMore))) return;
    try {
      append ? setLoadingMore(true) : setLoading(true);
      setError('');
      let ref = database().ref('users').orderByKey();
      if (append && lastUid) ref = ref.startAt(lastUid);
      // A cursor query includes the cursor record, so request one extra item
      // when appending and discard that duplicate below.
      const snapshot = await ref
        .limitToFirst(PAGE_SIZE + (append && lastUid ? 2 : 1))
        .once('value');
      let loaded: UserRecord[] = [];
      snapshot.forEach((child: any) => {
        const user = getUser(child);
        if (user) loaded.push(user);
        return false;
      });
      if (append && lastUid) loaded = loaded.filter(user => String(user.uid) !== lastUid);
      const moreAvailable = loaded.length > PAGE_SIZE;
      const pageUsers = loaded.slice(0, PAGE_SIZE);
      setUsers(previous => {
        if (!append) return pageUsers;
        const known = new Set(previous.map(user => String(user.uid)));
        return [...previous, ...pageUsers.filter(user => !known.has(String(user.uid)))];
      });
      setLastUid(pageUsers.length ? String(pageUsers[pageUsers.length - 1].uid || '') : null);
      setHasMore(moreAvailable);
    } catch (loadError: any) {
      setError(readableError(loadError, 'Unable to load users. Please try again.'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [allowed, hasMore, lastUid, loadingMore]);

  useEffect(() => {
    if (allowed) loadUsers(false);
    // Pagination state must not restart the initial fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const snapshot = await database().ref('users').once('value');
        const found: UserRecord[] = [];
        snapshot.forEach((child: any) => {
          const user = getUser(child);
          if (user && matches(user, needle)) found.push(user);
          return false;
        });
        if (!cancelled) setSearchResults(found);
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
  }, [allowed, query]);

  const selectUser = (item: UserRecord) => {
    const uid = String(item.uid || '');
    if (!uid) return setError('This record has no valid user ID.');
    setSelectedUid(uid);
    const currentStatus = String(item.profile?.status ?? '').toLowerCase();
    setEditingUser({
      gender: String(item.profile?.gender ?? ''),
      name: String(item.profile?.name ?? ''),
      tamilName: String(item.profile?.tamilName ?? ''),
      voiceVerified: Boolean(item.verification?.voiceVerified),
      birthYear: String(item.profile?.birthYear ?? ''),
      status: USER_STATUSES.includes(currentStatus as typeof USER_STATUSES[number])
        ? currentStatus
        : 'offline',
      avatarId: String(item.profile?.avatarId ?? ''),
      balance: String(item.wallet?.balance ?? ''),
    });
    setError('');
  };
  const closeEditor = () => {
    if (!saving) {
      setSelectedUid('');
      setEditingUser(null);
    }
  };
  const updateField = <K extends keyof EditableUserFields>(field: K, value: EditableUserFields[K]) =>
    setEditingUser(previous => (previous ? { ...previous, [field]: value } : previous));

  const updateLocalUser = (uid: string, fields: EditableUserFields) => {
    const update = (user: UserRecord): UserRecord => String(user.uid) !== uid ? user : ({
      ...user,
      profile: {
        ...(user.profile || {}), gender: fields.gender.trim(), name: fields.name.trim(),
        tamilName: fields.tamilName.trim(), birthYear: fields.birthYear,
        avatarId: Number.isFinite(Number(fields.avatarId)) ? Number(fields.avatarId) : fields.avatarId.trim(),
        status: fields.status.trim(),
      },
      verification: { ...(user.verification || {}), voiceVerified: fields.voiceVerified },
      wallet: { ...(user.wallet || {}), balance: Number(fields.balance) || 0 },
    });
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
      if (birthYear && (!Number.isInteger(year) || year < 1900 || year > currentYear)) {
        throw new Error(`Birth year must be between 1900 and ${currentYear}.`);
      }
      const balance = editingUser.balance.trim() ? Number(editingUser.balance.trim()) : 0;
      if (!Number.isFinite(balance)) throw new Error('Balance must be a valid number.');
      const avatarText = editingUser.avatarId.trim();
      const avatarId = avatarText && Number.isFinite(Number(avatarText)) ? Number(avatarText) : avatarText;
      const normalized = { ...editingUser, birthYear, balance: String(balance), avatarId: String(avatarId) };
      await database().ref().update({
        [`users/${selectedUid}/profile/gender`]: editingUser.gender.trim(),
        [`users/${selectedUid}/profile/name`]: editingUser.name.trim(),
        [`users/${selectedUid}/profile/tamilName`]: editingUser.tamilName.trim(),
        [`users/${selectedUid}/profile/birthYear`]: birthYear,
        [`users/${selectedUid}/profile/avatarId`]: avatarId,
        [`users/${selectedUid}/profile/status`]: editingUser.status.trim(),
        [`users/${selectedUid}/verification/voiceVerified`]: editingUser.voiceVerified,
        [`users/${selectedUid}/wallet/balance`]: balance,
      });
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
    Alert.alert('Delete User Data', `Permanently delete database data for ${uid}? This cannot be undone. The Firebase Authentication account is not deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          setSaving(true);
          await database().ref().update({
            [`users/${uid}`]: null, [`rooms/${uid}`]: null, [`callHistory/${uid}`]: null,
          });
          setUsers(previous => previous.filter(user => String(user.uid) !== uid));
          setSearchResults(previous => previous.filter(user => String(user.uid) !== uid));
          setSelectedUid('');
          setEditingUser(null);
        } catch (deleteError: any) {
          const message = readableError(deleteError, 'Unable to delete this user.');
          setError(message);
          Alert.alert('Delete Failed', message);
        } finally {
          setSaving(false);
        }
      } },
    ]);
  };

  if (!allowed) return (
    <SafeAreaView style={styles.centered}>
      <MaterialCommunityIcons name="shield-lock" size={52} color={Colors.danger} />
      <Text style={styles.deniedTitle}>Access denied</Text>
      <Text style={styles.deniedText}>This account is not configured as an administrator.</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.primaryButtonText}>Go Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  const renderUser = ({ item }: { item: UserRecord }) => {
    const uid = String(item.uid || '');
    const name = String(item.profile?.name || item.profile?.tamilName || 'Unnamed user');
    return (
      <TouchableOpacity style={styles.userRow} onPress={() => selectUser(item)}>
        <View style={styles.userAvatar}><Text style={styles.userAvatarText}>{name.trim().charAt(0).toUpperCase() || '?'}</Text></View>
        <View style={styles.userCopy}>
          <Text style={styles.userName} numberOfLines={1}>{name}</Text>
          <Text style={styles.userMeta} numberOfLines={1}>{String(item.phone || uid)}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={23} color={Colors.placeholder} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}><MaterialCommunityIcons name="arrow-left" size={25} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Manage Users</Text><View style={styles.iconButton} />
      </View>
      <FlatList
        data={displayedUsers} keyExtractor={item => String(item.uid)} renderItem={renderUser}
        keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
        onEndReached={() => { if (!isSearching) loadUsers(true); }} onEndReachedThreshold={0.35}
        ListHeaderComponent={<>
          <TextInput value={query} onChangeText={setQuery} placeholder="Search all users..." placeholderTextColor={Colors.placeholder} style={styles.searchInput} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.resultInfo}>
            <Text style={styles.resultText}>{isSearching ? `${displayedUsers.length} matches` : `${users.length} users loaded`}</Text>
            {searching ? <ActivityIndicator size="small" color={Colors.secondary} /> : null}
          </View>
        </>}
        ListEmptyComponent={loading || searching ? <ActivityIndicator color={Colors.secondary} style={styles.loader} /> : <Text style={styles.empty}>{isSearching ? 'No users found.' : 'No users available.'}</Text>}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.secondary} style={styles.footerLoader} /> : !isSearching && users.length > 0 && !hasMore ? <Text style={styles.endText}>All users loaded</Text> : null}
      />

      <Modal visible={Boolean(selectedUid && editingUser)} animationType="slide" onRequestClose={closeEditor}>
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.iconButton} onPress={closeEditor} disabled={saving}><MaterialCommunityIcons name="close" size={26} color={Colors.text} /></TouchableOpacity>
              <View style={styles.modalTitleCopy}><Text style={styles.editorTitle}>Edit User</Text><Text style={styles.uidText} numberOfLines={1}>{selectedUid}</Text></View>
              <View style={styles.iconButton} />
            </View>
            {editingUser ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editorContent}>
              <Text style={styles.sectionTitle}>Profile</Text>
              <Text style={styles.label}>Name</Text><TextInput value={editingUser.name} onChangeText={value => updateField('name', value)} style={styles.input} placeholder="Name" placeholderTextColor={Colors.placeholder} />
              <Text style={styles.label}>Tamil Name</Text><TextInput value={editingUser.tamilName} onChangeText={value => updateField('tamilName', value)} style={styles.input} placeholder="Tamil name" placeholderTextColor={Colors.placeholder} />
              <Text style={styles.label}>Gender</Text><TextInput value={editingUser.gender} onChangeText={value => updateField('gender', value)} style={styles.input} placeholder="Gender" placeholderTextColor={Colors.placeholder} />
              <Text style={styles.label}>Birth Year</Text><TextInput value={editingUser.birthYear} onChangeText={value => updateField('birthYear', value.replace(/[^0-9]/g, ''))} style={styles.input} placeholder="e.g. 1995" placeholderTextColor={Colors.placeholder} keyboardType="number-pad" maxLength={4} />
              <Text style={styles.label}>Avatar ID</Text><TextInput value={editingUser.avatarId} onChangeText={value => updateField('avatarId', value.replace(/[^0-9]/g, ''))} style={styles.input} placeholder="e.g. 1" placeholderTextColor={Colors.placeholder} keyboardType="number-pad" />
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusOptions}>
                {USER_STATUSES.map(status => {
                  const selected = editingUser.status === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[styles.statusOption, selected && styles.statusOptionSelected]}
                      onPress={() => updateField('status', status)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.statusOptionText, selected && styles.statusOptionTextSelected]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.sectionTitle}>Verification</Text>
              <View style={styles.switchRow}><View style={styles.switchCopy}><Text style={styles.switchTitle}>Voice Verified</Text><Text style={styles.switchHelp}>Mark this user's voice verification status.</Text></View><Switch value={editingUser.voiceVerified} onValueChange={value => updateField('voiceVerified', value)} trackColor={{ false: Colors.border, true: Colors.primary }} /></View>
              <Text style={styles.sectionTitle}>Wallet</Text>
              <Text style={styles.label}>Balance</Text><TextInput value={editingUser.balance} onChangeText={value => updateField('balance', value.replace(/[^0-9.-]/g, ''))} style={styles.input} placeholder="0" placeholderTextColor={Colors.placeholder} keyboardType="decimal-pad" />
              <TouchableOpacity disabled={saving} style={[styles.primaryButton, saving && styles.buttonDisabled]} onPress={saveUser}>{saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryButtonText}>Save Changes</Text>}</TouchableOpacity>
              <TouchableOpacity disabled={saving} style={[styles.deleteButton, saving && styles.buttonDisabled]} onPress={deleteUser}><Text style={styles.deleteText}>Delete User Data</Text></TouchableOpacity>
            </ScrollView> : null}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background }, modalContainer: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider, paddingHorizontal: 10, paddingVertical: 8 },
  modalTitleCopy: { flex: 1, alignItems: 'center', paddingHorizontal: 8 }, iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text }, content: { paddingHorizontal: 16, paddingBottom: 60, flexGrow: 1 },
  searchInput: { height: 52, marginTop: 6, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 15, color: Colors.text, fontSize: 14 },
  error: { color: Colors.danger, fontSize: 13, lineHeight: 19, marginTop: 10, paddingHorizontal: 4 },
  resultInfo: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }, resultText: { color: Colors.subText, fontSize: 13, fontWeight: '600' },
  loader: { marginTop: 35 }, footerLoader: { marginVertical: 20 }, endText: { textAlign: 'center', color: Colors.subText, fontSize: 13, marginVertical: 20 },
  userRow: { minHeight: 72, paddingHorizontal: 15, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, userAvatarText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  userCopy: { flex: 1, minWidth: 0 }, userName: { color: Colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 }, userMeta: { color: Colors.subText, fontSize: 12 }, empty: { color: Colors.subText, textAlign: 'center', paddingVertical: 36, fontSize: 14 },
  editorContent: { padding: 20, paddingBottom: 80 }, editorTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' }, uidText: { color: Colors.subText, fontSize: 11, marginTop: 2, maxWidth: 250 },
  sectionTitle: { color: Colors.primary, fontSize: 14, fontWeight: '800', marginTop: 20, marginBottom: 12, textTransform: 'uppercase' }, label: { color: Colors.text, fontSize: 13, fontWeight: '600', marginBottom: 7 },
  input: { minHeight: 50, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 14, color: Colors.text, fontSize: 14, marginBottom: 15 },
  statusOptions: { flexDirection: 'row', marginBottom: 15, gap: 8 },
  statusOption: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 12, backgroundColor: Colors.white },
  statusOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  statusOptionText: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  statusOptionTextSelected: { color: Colors.white },
  switchRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, backgroundColor: Colors.white }, switchCopy: { flex: 1, paddingRight: 14 }, switchTitle: { color: Colors.text, fontSize: 14, fontWeight: '700' }, switchHelp: { color: Colors.subText, fontSize: 12, lineHeight: 17, marginTop: 3 },
  primaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, marginTop: 24 }, primaryButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  deleteButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 1, borderColor: Colors.danger, borderRadius: 14 }, deleteText: { color: Colors.danger, fontSize: 14, fontWeight: '700' }, buttonDisabled: { opacity: 0.55 },
  deniedTitle: { color: Colors.text, fontSize: 22, fontWeight: '700', marginTop: 15 }, deniedText: { color: Colors.subText, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 21 },
});
