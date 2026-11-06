# Admin data scaling

The admin client uses bounded Realtime Database queries so user and history
collections are never downloaded in full.

## Required indexes

Merge the following `.indexOn` entries into the existing production Realtime
Database rules under the `speakly` data root. Do not replace existing read,
write, or validation rules with this snippet.

```json
{
  "rules": {
    "speakly": {
      "users": {
        ".indexOn": ["createdAt"]
      },
      "withdrawalRequests": {
        ".indexOn": ["status", "requestedAt"]
      },
      "expertApplications": {
        ".indexOn": ["status", "submittedAt"]
      },
      "expertActivityLatest": {
        ".indexOn": ["createdAt"]
      },
      "expertActivity": {
        "$expertUid": {
          ".indexOn": ["createdAt"]
        }
      },
      "callHistory": {
        "$expertUid": {
          ".indexOn": ["startedAt"]
        }
      }
    }
  }
}
```

## Data requirements

- New user records must retain the numeric `createdAt` field written during
  account creation.
- Legacy records without `createdAt` should be backfilled once before relying
  on strict chronological pagination.
- New expert activity writes update both the append-only expert history and
  `expertActivityLatest/{expertUid}`. Existing experts appear in the activity
  overview after their next activity event; historical detail remains in the
  original collection.

## Query limits

- User pages: 50 records.
- Expert call-history pages: 50 records.
- Pending admin queues: at most 100 records per live query.
- Expert activity overview: latest 50 experts.
- Selected-expert activity summary: latest 100 activity records.

Search is intentionally bounded: it searches already loaded pages and performs
a direct lookup when the query is an exact Firebase user ID. Substring search
across 100,000 users requires a dedicated search index (for example Algolia,
Typesense, or a server-maintained normalized Firebase index); it must not scan
the entire `users` collection from a mobile client.
