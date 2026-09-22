import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import database from '@react-native-firebase/database';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Colors from '../../constants/colors';
import { useUser } from '../../hooks/UserContext';

type UserRecord = Record<string, any> & {
  uid?: string;
};

type EditableUserFields = {
  gender: string;
  name: string;
  tamilName: string;
  voiceVerified: boolean;
  birthYear: string;
  status: string;
  avatarId: string;
  balance: string;
};

const PAGE_SIZE = 25;

const readableError = (error: any, fallback: string) =>
  typeof error?.message === 'string' && error.message.trim()
    ? error.message
    : fallback;

export const AdminUsersScreen = ({ navigation }: any) => {
  const { user: currentUser } = useUser();

  const allowed = currentUser?.isAdmin || false;

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [query, setQuery] = useState('');

  const [selectedUid, setSelectedUid] = useState('');
  const [editingUser, setEditingUser] = useState<EditableUserFields | null>(
    null,
  );

  const [loading, setLoading] = useState(allowed);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(0);

  /**
   * Cursor for each page.
   *
   * pageCursors[0] = null / beginning
   * pageCursors[1] = last UID of page 1
   * pageCursors[2] = last UID of page 2
   * etc.
   */
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null]);

  const [hasNextPage, setHasNextPage] = useState(false);

  /**
   * Convert a Firebase child snapshot into our UserRecord.
   */
  const getUserFromSnapshot = (snapshot: any): UserRecord | null => {
    const value = snapshot.val();

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return {
      ...value,
      uid: snapshot.key || value.uid,
    };
  };

  /**
   * Load one page of users.
   *
   * We load PAGE_SIZE + 1 records so we can determine whether
   * another page exists without loading the entire users collection.
   */
  const loadPage = useCallback(
    async (pageNumber: number, cursor: string | null) => {
      if (!allowed) return;

      try {
        setLoading(true);
        setError('');

        let ref;

        if (cursor) {
          /**
           * startAt includes the cursor itself.
           * We remove it after reading.
           */
          ref = database()
            .ref('users')
            .orderByKey()
            .startAt(cursor)
            .limitToFirst(PAGE_SIZE + 1);
        } else {
          ref = database()
            .ref('users')
            .orderByKey()
            .limitToFirst(PAGE_SIZE + 1);
        }

        const snapshot = await ref.once('value');

        const loadedUsers: UserRecord[] = [];

        snapshot.forEach((child: any) => {
          const user = getUserFromSnapshot(child);

          if (user) {
            loadedUsers.push(user);
          }

          return false;
        });

        let pageUsers = loadedUsers;

        /**
         * startAt(cursor) includes the previous page's final user.
         * Remove that duplicate.
         */
        if (cursor) {
          pageUsers = pageUsers.filter(
            user => String(user.uid) !== String(cursor),
          );
        }

        const morePagesAvailable = pageUsers.length > PAGE_SIZE;

        if (morePagesAvailable) {
          pageUsers = pageUsers.slice(0, PAGE_SIZE);
        }

        setUsers(pageUsers);
        setPage(pageNumber);
        setHasNextPage(morePagesAvailable);

        /**
         * Save the last UID as the cursor for the next page.
         */
        if (morePagesAvailable && pageUsers.length > 0) {
          const lastUser = pageUsers[pageUsers.length - 1];

          const lastUid = String(lastUser.uid || '');

          if (lastUid) {
            setPageCursors(previous => {
              const next = [...previous];
              next[pageNumber + 1] = lastUid;
              return next;
            });
          }
        }
      } catch (loadError: any) {
        setError(
          readableError(loadError, 'Unable to load users. Please try again.'),
        );
      } finally {
        setLoading(false);
      }
    },
    [allowed],
  );

  /**
   * Initial page.
   */
  useEffect(() => {
    if (!allowed) return;

    loadPage(0, null);
  }, [allowed, loadPage]);

  /**
   * Go to next page.
   */
  const goToNextPage = () => {
    if (loading || !hasNextPage) return;

    const nextCursor = pageCursors[page + 1];

    if (!nextCursor) {
      setError('Unable to determine the next page.');
      return;
    }

    setSelectedUid('');
    setEditingUser(null);

    loadPage(page + 1, nextCursor);
  };

  /**
   * Go to previous page.
   *
   * To return to page N, we use the cursor stored for that page.
   */
  const goToPreviousPage = () => {
    if (loading || page <= 0) return;

    const previousPage = page - 1;
    const previousCursor = pageCursors[previousPage] || null;

    setSelectedUid('');
    setEditingUser(null);

    loadPage(previousPage, previousCursor);
  };

  /**
   * Search only within the currently loaded page.
   *
   * This is intentional. Searching the entire /users collection
   * client-side would defeat pagination and download thousands
   * of records.
   */
  const filteredUsers = users.filter(item => {
    const needle = query.trim().toLocaleLowerCase();

    if (!needle) return true;

    return [item.uid, item.phone, item.profile?.name, item.profile?.tamilName]
      .map(value => String(value || '').toLocaleLowerCase())
      .some(value => value.includes(needle));
  });

  /**
   * Select user for editing.
   */
  const selectUser = (item: UserRecord) => {
    const uid = String(item.uid || '');

    if (!uid) {
      setError('This record has no valid user ID.');
      return;
    }

    setSelectedUid(uid);

    setEditingUser({
      gender: String(item.profile?.gender ?? ''),
      name: String(item.profile?.name ?? ''),
      tamilName: String(item.profile?.tamilName ?? ''),

      voiceVerified: Boolean(item.verification?.voiceVerified),

      birthYear: String(item.profile?.birthYear ?? ''),

      status: String(item.profile?.status ?? ''),

      avatarId: String(item.profile?.avatarId ?? ''),

      balance: String(item.wallet?.balance ?? ''),
    });

    setError('');
  };

  /**
   * Update one field in the editing form.
   */
  const updateField = <K extends keyof EditableUserFields>(
    field: K,
    value: EditableUserFields[K],
  ) => {
    setEditingUser(previous =>
      previous
        ? {
            ...previous,
            [field]: value,
          }
        : previous,
    );
  };

  /**
   * Save only the allowed fields.
   *
   * IMPORTANT:
   *
   * We intentionally use update() with individual paths.
   *
   * We DO NOT use:
   *
   *   users/{uid}.set(...)
   *
   * because that could overwrite unrelated user data.
   */
  const saveUser = async () => {
    if (!selectedUid || !editingUser || saving) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      /**
       * Validate birth year.
       */
      let birthYear = '';

      if (editingUser.birthYear.trim()) {
        const parsedBirthYear = Number(editingUser.birthYear.trim());

        if (
          !Number.isInteger(parsedBirthYear) ||
          parsedBirthYear < 1900 ||
          parsedBirthYear > new Date().getFullYear()
        ) {
          throw new Error(
            `Birth year must be between 1900 and ${new Date().getFullYear()}.`,
          );
        }

        birthYear = String(parsedBirthYear);
      }

      /**
       * Validate balance.
       */
      let balance = 0;

      if (editingUser.balance.trim()) {
        const parsedBalance = Number(editingUser.balance.trim());

        if (!Number.isFinite(parsedBalance)) {
          throw new Error('Balance must be a valid number.');
        }

        balance = parsedBalance;
      }

      /**
       * Avatar ID in your data is initialized as:
       *
       * avatarId: 1
       *
       * so save it as a number when possible.
       */
      let avatarId: number | string = '';

      if (editingUser.avatarId.trim()) {
        const parsedAvatarId = Number(editingUser.avatarId.trim());

        avatarId = Number.isFinite(parsedAvatarId)
          ? parsedAvatarId
          : editingUser.avatarId.trim();
      }

      /**
       * Only these 8 fields can be changed.
       *
       * Existing:
       * - createdAt
       * - lastSeen
       * - phone
       * - profile.rating
       * - profile.category
       * - profile.image
       * - profile.price
       * - profile.age
       * - settings
       * - etc.
       *
       * are completely untouched.
       */
      const updates: Record<string, any> = {
        [`users/${selectedUid}/profile/gender`]: editingUser.gender.trim(),

        [`users/${selectedUid}/profile/name`]: editingUser.name.trim(),

        [`users/${selectedUid}/profile/tamilName`]:
          editingUser.tamilName.trim(),

        [`users/${selectedUid}/profile/birthYear`]: birthYear,

        [`users/${selectedUid}/profile/avatarId`]: avatarId,

        [`users/${selectedUid}/profile/status`]: editingUser.status.trim(),

        [`users/${selectedUid}/verification/voiceVerified`]:
          editingUser.voiceVerified,

        [`users/${selectedUid}/wallet/balance`]: balance,
      };

      await database().ref().update(updates);

      /**
       * Update local UI immediately.
       */
      setUsers(previous =>
        previous.map(user => {
          if (String(user.uid) !== String(selectedUid)) {
            return user;
          }

          return {
            ...user,

            profile: {
              ...(user.profile || {}),

              gender: editingUser.gender.trim(),

              name: editingUser.name.trim(),

              tamilName: editingUser.tamilName.trim(),

              birthYear,

              avatarId,

              status: editingUser.status.trim(),
            },

            verification: {
              ...(user.verification || {}),

              voiceVerified: editingUser.voiceVerified,
            },

            wallet: {
              ...(user.wallet || {}),

              balance,
            },
          };
        }),
      );

      /**
       * Update the editor values too in case the normalized
       * values differ from what the user entered.
       */
      setEditingUser(previous =>
        previous
          ? {
              ...previous,
              birthYear,
              balance: String(balance),
              avatarId: String(avatarId),
            }
          : previous,
      );

      Alert.alert(
        'Saved',
        'The selected user fields were updated successfully.',
      );
    } catch (saveError: any) {
      const message = readableError(saveError, 'Unable to update this user.');

      setError(message);

      Alert.alert('Update Failed', message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Delete all database data associated with this user.
   */
  const deleteUser = () => {
    if (!selectedUid || saving) return;

    Alert.alert(
      'Delete User Data',
      `Permanently delete database data for ${selectedUid}? This cannot be undone. The Firebase Authentication account must be deleted through a trusted backend or Firebase Console.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            try {
              setSaving(true);
              setError('');

              await database()
                .ref()
                .update({
                  [`users/${selectedUid}`]: null,

                  [`rooms/${selectedUid}`]: null,

                  [`callHistory/${selectedUid}`]: null,
                });

              setSelectedUid('');
              setEditingUser(null);

              /**
               * Reload current page.
               */
              await loadPage(page, pageCursors[page] || null);
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

  /**
   * Access denied.
   */
  if (!allowed) {
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
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
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

        <View style={styles.iconButton} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {/* Search */}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search this page..."
          placeholderTextColor={Colors.placeholder}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Loading */}
        {loading ? (
          <ActivityIndicator color={Colors.secondary} style={styles.loader} />
        ) : (
          <>
            {/* Page information */}
            <View style={styles.pageInfo}>
              <Text style={styles.pageText}>Page {page + 1}</Text>

              <Text style={styles.pageText}>{filteredUsers.length} users</Text>
            </View>

            {/* User list */}
            <View style={styles.results}>
              {filteredUsers.map(item => {
                const uid = String(item.uid || '');

                const isSelected = uid === selectedUid;

                return (
                  <TouchableOpacity
                    key={uid}
                    style={[
                      styles.userRow,
                      isSelected && styles.userRowSelected,
                    ]}
                    onPress={() => selectUser(item)}
                  >
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {String(
                          item.profile?.name || item.profile?.tamilName || '?',
                        )
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.userCopy}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {String(
                          item.profile?.name ||
                            item.profile?.tamilName ||
                            'Unnamed user',
                        )}
                      </Text>

                      <Text style={styles.userMeta} numberOfLines={1}>
                        {String(item.phone || uid)}
                      </Text>
                    </View>

                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={23}
                      color={isSelected ? Colors.primary : Colors.placeholder}
                    />
                  </TouchableOpacity>
                );
              })}

              {!filteredUsers.length && (
                <Text style={styles.empty}>No users found on this page.</Text>
              )}
            </View>

            {/* Pagination */}
            <View style={styles.pagination}>
              <TouchableOpacity
                disabled={page <= 0 || loading}
                onPress={goToPreviousPage}
                style={[
                  styles.pageButton,
                  (page <= 0 || loading) && styles.pageButtonDisabled,
                ]}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={22}
                  color={
                    page <= 0 || loading ? Colors.placeholder : Colors.white
                  }
                />

                <Text
                  style={[
                    styles.pageButtonText,
                    (page <= 0 || loading) && styles.pageButtonTextDisabled,
                  ]}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={!hasNextPage || loading}
                onPress={goToNextPage}
                style={[
                  styles.pageButton,
                  (!hasNextPage || loading) && styles.pageButtonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    (!hasNextPage || loading) && styles.pageButtonTextDisabled,
                  ]}
                >
                  Next
                </Text>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={
                    !hasNextPage || loading ? Colors.placeholder : Colors.white
                  }
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Editor */}
        {selectedUid && editingUser ? (
          <View style={styles.editorCard}>
            <View style={styles.editorHeader}>
              <View style={styles.editorHeaderCopy}>
                <Text style={styles.editorTitle}>Edit User</Text>

                <Text style={styles.uidText} numberOfLines={1}>
                  {selectedUid}
                </Text>
              </View>
            </View>

            {/* Profile */}
            <Text style={styles.sectionTitle}>Profile</Text>

            {/* Name */}
            <Text style={styles.label}>Name</Text>

            <TextInput
              value={editingUser.name}
              onChangeText={value => updateField('name', value)}
              placeholder="Name"
              placeholderTextColor={Colors.placeholder}
              style={styles.input}
            />

            {/* Tamil Name */}
            <Text style={styles.label}>Tamil Name</Text>

            <TextInput
              value={editingUser.tamilName}
              onChangeText={value => updateField('tamilName', value)}
              placeholder="Tamil name"
              placeholderTextColor={Colors.placeholder}
              style={styles.input}
            />

            {/* Gender */}
            <Text style={styles.label}>Gender</Text>

            <TextInput
              value={editingUser.gender}
              onChangeText={value => updateField('gender', value)}
              placeholder="Gender"
              placeholderTextColor={Colors.placeholder}
              style={styles.input}
            />

            {/* Birth Year */}
            <Text style={styles.label}>Birth Year</Text>

            <TextInput
              value={editingUser.birthYear}
              onChangeText={value =>
                updateField('birthYear', value.replace(/[^0-9]/g, ''))
              }
              placeholder="e.g. 1995"
              placeholderTextColor={Colors.placeholder}
              keyboardType="number-pad"
              maxLength={4}
              style={styles.input}
            />

            {/* Avatar ID */}
            <Text style={styles.label}>Avatar ID</Text>

            <TextInput
              value={editingUser.avatarId}
              onChangeText={value =>
                updateField('avatarId', value.replace(/[^0-9]/g, ''))
              }
              placeholder="e.g. 1"
              placeholderTextColor={Colors.placeholder}
              keyboardType="number-pad"
              style={styles.input}
            />

            {/* Status */}
            <Text style={styles.label}>Status</Text>

            <TextInput
              value={editingUser.status}
              onChangeText={value => updateField('status', value)}
              placeholder="offline"
              placeholderTextColor={Colors.placeholder}
              style={styles.input}
              autoCapitalize="none"
            />

            {/* Verification */}
            <Text style={styles.sectionTitle}>Verification</Text>

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
                trackColor={{
                  false: Colors.border,
                  true: Colors.primary,
                }}
              />
            </View>

            {/* Wallet */}
            <Text style={styles.sectionTitle}>Wallet</Text>

            <Text style={styles.label}>Balance</Text>

            <TextInput
              value={editingUser.balance}
              onChangeText={value =>
                updateField('balance', value.replace(/[^0-9.-]/g, ''))
              }
              placeholder="0"
              placeholderTextColor={Colors.placeholder}
              keyboardType="decimal-pad"
              style={styles.input}
            />

            {/* Save */}
            <TouchableOpacity
              disabled={saving}
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
              onPress={saveUser}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
              disabled={saving}
              style={[styles.deleteButton, saving && styles.buttonDisabled]}
              onPress={deleteUser}
            >
              <Text style={styles.deleteText}>Delete User Data</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

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

  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },

  content: {
    padding: 16,
    paddingBottom: 100,
  },

  searchInput: {
    height: 52,
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

  loader: {
    marginTop: 35,
  },

  pageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  pageText: {
    color: Colors.subText,
    fontSize: 13,
    fontWeight: '600',
  },

  results: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  userRow: {
    minHeight: 72,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },

  userRowSelected: {
    backgroundColor: Colors.primary + '10',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
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

  userAvatarText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  userCopy: {
    flex: 1,
    paddingRight: 10,
  },

  userName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  userMeta: {
    color: Colors.subText,
    fontSize: 12,
    marginTop: 4,
  },

  empty: {
    color: Colors.subText,
    fontSize: 14,
    padding: 22,
    textAlign: 'center',
  },

  pagination: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  pageButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  pageButtonDisabled: {
    backgroundColor: Colors.border,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  pageButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },

  pageButtonTextDisabled: {
    color: Colors.placeholder,
  },

  editorCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },

  editorHeaderCopy: {
    flex: 1,
  },

  editorTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },

  uidText: {
    color: Colors.subText,
    fontSize: 11,
    marginTop: 4,
  },

  sectionTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },

  label: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 11,
    marginBottom: 6,
  },

  input: {
    minHeight: 48,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
  },

  inputFocused: {
    borderColor: Colors.primary,
  },

  switchRow: {
    minHeight: 64,
    marginTop: 18,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  switchCopy: {
    flex: 1,
    paddingRight: 12,
  },

  switchTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  switchHelp: {
    color: Colors.subText,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
    marginTop: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  primaryButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },

  deleteButton: {
    minHeight: 48,
    borderRadius: 14,
    marginTop: 10,
    backgroundColor: Colors.errorStrongSurface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  deleteText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },

  deniedTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 14,
  },

  deniedText: {
    color: Colors.subText,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
});
