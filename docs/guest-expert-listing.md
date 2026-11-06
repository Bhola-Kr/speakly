# Guest expert listing

The guest Home screen reads Realtime Database directly with this bounded query:

```text
/speakly/users
orderByChild=isExpert
equalTo=true
limitToFirst=100
```

Production rules must index `isExpert` and explicitly allow this query for
unauthenticated users. Merge the following conditions into the existing rules;
do not replace unrelated security rules:

```json
{
  "rules": {
    "speakly": {
      "users": {
        ".indexOn": ["isExpert"],
        ".read": "auth != null || (query.orderByChild == 'isExpert' && query.equalTo == true && query.limitToFirst != null && query.limitToFirst <= 100)"
      }
    }
  }
}
```

Important: Realtime Database rules authorize complete nodes; they do not remove
private child fields from query results. With the current schema, this rule can
return each matching expert's entire user node. For strict field-level privacy,
store the public profile fields in a dedicated `/speakly/publicExperts` path and
allow guest reads only on that path.
