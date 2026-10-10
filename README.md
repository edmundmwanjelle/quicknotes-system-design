# QuickNotes System Design

## Description

QuickNotes is a browser-based API client and a system-design exercise for a note-taking service planned to support one million registered users. The front end demonstrates GET, POST, and DELETE requests using the JSONPlaceholder practice API. The documentation specifies the production REST API, relational database model, and scalable service architecture.

**Important:** JSONPlaceholder is a mock API. Created and deleted posts are not permanently persisted by that service. The design documents describe the real backend that would be built for production.

## Project files

```text
quicknotes-system-design/
├── index.html
├── style.css
├── api.js
├── README.md
└── docs/
    ├── api-design.md
    ├── data-model.md
    └── architecture.md
```

## How to run the API client

1. Clone or download this repository.
2. Open the project folder in Visual Studio Code.
3. Open `index.html` using the Live Server extension, or serve the folder with any simple local HTTP server.
4. Click **Load notes** to fetch ten posts.
5. Use the form to create a test post and each note's **Delete** button to test deletion.
6. An internet connection is required to reach JSONPlaceholder.

The client is a front-end demonstration; it does not require a local backend server.

## Design documents

- [API design](docs/api-design.md) — REST endpoints, payloads, success statuses, and error responses.
- [Data model](docs/data-model.md) — SQL tables, keys, relationships, queries, indexes, and database choice.
- [Architecture](docs/architecture.md) — requirements, scale estimates, architecture diagram, request flows, and trade-offs.

## What I learned

- How to use a reusable asynchronous `fetch` helper and handle HTTP/network failures.
- How to validate user input, disable controls during requests, and render untrusted text with `textContent`.
- How REST endpoints, status codes, pagination, and consistent error envelopes make an API easier to use.
- How primary keys, foreign keys, indexes, transactions, and a junction table protect relational data.
- How caching, load balancing, read replicas, queues, and background workers address different scaling challenges.
- Why capacity estimates are assumptions that must be verified through monitoring and load testing.

## Git history

The assignment requires at least five meaningful commits. Suggested sequence:

1. `Add API client with GET`
2. `Add create note with POST`
3. `Add delete with DELETE`
4. `Add API design doc`
5. `Add data model doc`
6. `Add architecture doc`
7. `Add README`

If some commits already exist, keep them and commit the missing documentation rather than rewriting published history.
