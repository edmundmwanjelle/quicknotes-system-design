# QuickNotes REST API Design

## 1. Overview

This document specifies the production QuickNotes API. It is separate from the browser demo, which uses JSONPlaceholder for practice. The production API uses JSON over HTTPS, requires authentication for user-owned resources, and returns consistent error bodies.

**Base URL:** `https://api.quicknotes.example.com/v1` (placeholder domain; replace before deployment)

**Conventions**
- `Content-Type: application/json` for JSON request bodies.
- `Authorization: Bearer <access-token>` for authenticated endpoints.
- All note and tag resources are scoped to the authenticated user unless explicitly stated otherwise.
- Timestamps are ISO 8601 UTC strings.
- Paginated list endpoints use `limit` and `cursor`; clients should not fetch an entire user's notes in one request.

## 2. Endpoints

| Method | Path | Description | Success status |
|---|---|---|---|
| POST | `/auth/register` | Register a user account | `201 Created` |
| POST | `/auth/login` | Authenticate and issue access/refresh tokens | `200 OK` |
| GET | `/notes` | List the authenticated user's notes; supports pagination and search | `200 OK` |
| POST | `/notes` | Create a note | `201 Created` |
| GET | `/notes/{noteId}` | Retrieve one note owned by the user | `200 OK` |
| PATCH | `/notes/{noteId}` | Update selected fields of a note | `200 OK` |
| DELETE | `/notes/{noteId}` | Delete a note owned by the user | `204 No Content` |
| GET | `/tags` | List the user's tags | `200 OK` |
| PUT | `/notes/{noteId}/tags/{tagId}` | Attach an existing tag to a note | `204 No Content` |
| DELETE | `/notes/{noteId}/tags/{tagId}` | Detach a tag from a note | `204 No Content` |

## 3. Create a note

### Request

`POST /v1/notes`

Headers:

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

Body:

```json
{
  "title": "Plan the week",
  "body": "Finish the API design and test the client.",
  "tagIds": [2, 5]
}
```

Validation: `title` is required, trimmed, and 1–100 characters; `body` is optional and limited to 20,000 characters; every `tagIds` entry must belong to the authenticated user.

### Response — `201 Created`

```json
{
  "data": {
    "id": 101,
    "userId": 7,
    "title": "Plan the week",
    "body": "Finish the API design and test the client.",
    "tags": [
      { "id": 2, "name": "Work" },
      { "id": 5, "name": "Study" }
    ],
    "createdAt": "2026-10-10T11:30:00Z",
    "updatedAt": "2026-10-10T11:30:00Z"
  }
}
```

The server assigns `id`, `userId`, and timestamps; clients must not choose ownership or server-managed fields.

## 4. List notes

### Request

`GET /v1/notes?limit=20&cursor=eyJpZCI6MTAwfQ&tagId=2`

The `cursor` and `tagId` parameters are optional. Default `limit` is 20 and maximum is 100. Results are ordered by `updated_at DESC, id DESC`.

### Response — `200 OK`

```json
{
  "data": [
    {
      "id": 101,
      "userId": 7,
      "title": "Plan the week",
      "body": "Finish the API design and test the client.",
      "tags": [{ "id": 2, "name": "Work" }],
      "createdAt": "2026-10-10T11:30:00Z",
      "updatedAt": "2026-10-10T11:30:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "nextCursor": null
  }
}
```

An account with no notes receives `200 OK` with `"data": []`, not a `404`.

## 5. Retrieve, update and delete

### Retrieve one note

`GET /v1/notes/101` → `200 OK`

```json
{
  "data": {
    "id": 101,
    "userId": 7,
    "title": "Plan the week",
    "body": "Finish the API design and test the client.",
    "tags": [],
    "createdAt": "2026-10-10T11:30:00Z",
    "updatedAt": "2026-10-10T11:30:00Z"
  }
}
```

### Update a note

`PATCH /v1/notes/101`

```json
{
  "title": "Plan the next week",
  "body": "Review the API and database design."
}
```

Response: `200 OK` with the updated note in the same `data` envelope as the create response. Only supplied fields are changed.

### Delete a note

`DELETE /v1/notes/101`

Response: `204 No Content` with an empty response body. The server deletes the note and its `note_tags` associations in one transaction. A note belonging to another user is not disclosed.

## 6. Error codes and error body

The API returns a consistent JSON body for errors. `requestId` lets support and engineers trace a failed request.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The title must contain between 1 and 100 characters.",
    "details": [
      { "field": "title", "issue": "required_or_too_long" }
    ],
    "requestId": "req_01J9QK8D2A"
  }
}
```

| HTTP status | Meaning | Example |
|---|---|---|
| `400 Bad Request` | Invalid JSON, parameters, or field validation | Title is empty or over 100 characters |
| `401 Unauthorized` | Missing, invalid, or expired authentication token | Login again to obtain a valid token |
| `403 Forbidden` | Authenticated user lacks permission for an operation | Attempt to use a restricted administrative action |
| `404 Not Found` | Resource does not exist or is not visible to the user | Note ID cannot be found |
| `409 Conflict` | Request conflicts with current resource state | Duplicate tag name for the same user |
| `413 Payload Too Large` | Request exceeds configured body-size limit | Oversized note body |
| `429 Too Many Requests` | Rate limit exceeded | Too many requests in a short period |
| `500 Internal Server Error` | Unexpected server-side failure | Unhandled database or application error |
| `503 Service Unavailable` | Service temporarily cannot accept requests | Database failover or maintenance |

Do not return stack traces, SQL messages, access tokens, or other secrets to clients.

## 7. Security and operational notes

- Enforce HTTPS and validate authentication and ownership on every protected request.
- Use parameterized SQL statements and server-side input validation.
- Apply rate limits to login and write endpoints.
- Use structured logs, request IDs, health checks, and latency/error metrics.
- Use cursor pagination to avoid expensive large-offset scans at scale.
- The browser-only JSONPlaceholder demo is not a production persistence layer; successful demo POST/DELETE responses do not persist changes on the practice server.
