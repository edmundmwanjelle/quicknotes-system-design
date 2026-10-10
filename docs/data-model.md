# QuickNotes Relational Data Model

## 1. Database choice

Use a relational SQL database, such as PostgreSQL, as the primary store. Users, notes, and tags have clear relationships and integrity requirements. Foreign keys, transactions, unique constraints, and joins help prevent orphan records and keep note/tag associations consistent. Note bodies are primarily structured text, so a document database is not required for the core model. A cache and object storage can be added for specific workloads without replacing the relational source of truth.

## 2. Entities and relationships

- **users**: one account can own many notes and many tags (one-to-many).
- **notes**: each note belongs to exactly one user; deleting a user cascades to that user's notes.
- **tags**: each tag belongs to one user; tag names are unique per user.
- **note_tags**: junction table connecting notes and tags. A note can have many tags and a tag can label many notes (many-to-many).
- Composite primary key `(note_id, tag_id)` prevents the same tag from being attached to the same note twice. Composite foreign keys ensure a note cannot be linked to another user's tag.

## 3. SQL schema

The following PostgreSQL DDL creates all four tables and supporting indexes.

```sql
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 100),
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, id)
);

CREATE TABLE tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name),
    UNIQUE (user_id, id)
);

CREATE TABLE note_tags (
    note_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY (user_id, note_id)
        REFERENCES notes(user_id, id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, tag_id)
        REFERENCES tags(user_id, id) ON DELETE CASCADE
);

-- Supports a user's newest/most recently updated notes.
CREATE INDEX idx_notes_user_updated
    ON notes(user_id, updated_at DESC, id DESC);

-- Supports reverse lookup of all notes associated with a tag.
CREATE INDEX idx_note_tags_tag
    ON note_tags(tag_id, note_id);
```

Application code should update `updated_at` whenever a note changes (or use a database trigger).

## 4. Example SQL queries

### Query 1: List a user's latest notes

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = $1
ORDER BY updated_at DESC, id DESC
LIMIT 20;
```

### Query 2: Fetch a note with its tags (JOIN)

```sql
SELECT n.id, n.title, n.body, t.id AS tag_id, t.name AS tag_name
FROM notes AS n
LEFT JOIN note_tags AS nt ON nt.note_id = n.id
LEFT JOIN tags AS t ON t.id = nt.tag_id
WHERE n.user_id = $1 AND n.id = $2
ORDER BY t.name;
```

### Query 3: Count notes per user

```sql
SELECT u.id, u.email, COUNT(n.id) AS note_count
FROM users AS u
LEFT JOIN notes AS n ON n.user_id = u.id
GROUP BY u.id, u.email
ORDER BY note_count DESC;
```

### Query 4: Attach a tag safely

```sql
INSERT INTO note_tags (note_id, tag_id, user_id)
VALUES ($1, $2, $3)
ON CONFLICT (note_id, tag_id) DO NOTHING;
```

The API must first verify that the authenticated user owns both the note and the tag; the composite foreign keys provide a second integrity check.

## 5. Index rationale

`idx_notes_user_updated` supports the most common list operation: retrieve a user's notes ordered by most recently updated. The leading `user_id` column narrows the search to one account, while the remaining columns support the requested ordering and stable pagination. `idx_note_tags_tag` helps find notes for a given tag. Indexes speed up reads but consume disk and add write overhead, so production indexes should be reviewed against actual query plans and metrics.
