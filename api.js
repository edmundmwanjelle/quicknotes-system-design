
const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.querySelector("#load-btn");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitButton = document.querySelector("#submit-btn");
const statusElement = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");

let requestCount = 0;

function setStatus(message, type = "") {
    statusElement.textContent = message;
    statusElement.className = type ? `status ${type}` : "status";
}

function setBusy(button, busy, busyText, normalText) {
    button.disabled = busy;
    button.textContent = busy ? busyText : normalText;
}

function createNoteElement(note) {
    const item = document.createElement("li");
    item.className = "note-item";

    const heading = document.createElement("h3");
    heading.textContent = note.title || "Untitled note";

    const body = document.createElement("p");
    body.textContent = note.body || "No body provided.";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "Delete";

    // Track the request state per note so repeated clicks cannot
    // trigger duplicate delete requests for the same item.
    deleteButton.addEventListener("click", () => deleteNote(note, item, deleteButton));

    item.append(heading, body, deleteButton);
    return item;
}

function renderNotes(notes) {
    notesList.replaceChildren();

    if (!notes.length) {
        const emptyItem = document.createElement("li");
        emptyItem.textContent = "No notes found. Create your first note!";
        emptyItem.className = "note-item";
        notesList.append(emptyItem);
        return;
    }

    const fragment = document.createDocumentFragment();

    notes.forEach((note) => {
        fragment.append(createNoteElement(note));
    });

    notesList.append(fragment);
}

// Reusable request helper for GET, POST and DELETE.
async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Request failed (HTTP ${response.status}). Please try again.`);
    }

    // DELETE may return an empty response.
    if (response.status === 204) {
        return { data: null, status: response.status };
    }

    const data = await response.json();

    return { data, status: response.status };
}

// Task 1: GET the first 10 notes.
async function loadNotes() {
    setBusy(loadButton, true, "Loading...", "Load notes");
    setStatus("Loading notes...");

    try {
        const result = await request(`${API_URL}?_limit=10`);
        renderNotes(result.data);

        if (result.data.length === 0) {
            setStatus("No notes found.", "success");
        } else {
            setStatus(`Loaded ${result.data.length} notes from the server.`, "success");
        }
    } catch (error) {
        setStatus(error.message || "Unable to load notes. Check your connection.", "error");
    } finally {
        setBusy(loadButton, false, "Loading...", "Load notes");
    }
}

// Task 2: POST a new note.
async function createNote(event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (!title) {
        setStatus("Please enter a note title.", "error");
        titleInput.focus();
        return;
    }

    if (title.length > 100) {
        setStatus("The title must not exceed 100 characters.", "error");
        titleInput.focus();
        return;
    }

    setBusy(submitButton, true, "Creating...", "Create note");
    setStatus("Creating note...");

    try {
        const result = await request(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title,
                body,
                userId: 1
            })
        });

        const note = result.data;
        notesList.querySelector(".empty-state")?.remove();

        const emptyItem = notesList.querySelector("li");
        if (emptyItem && emptyItem.textContent === "No notes found. Create your first note!") {
            emptyItem.remove();
        }

        notesList.prepend(createNoteElement(note));
        setStatus(
            `Note created (status ${result.status}, id ${note.id}).`,
            "success"
        );

        noteForm.reset();
    } catch (error) {
        setStatus(error.message || "Unable to create the note.", "error");
    } finally {
        setBusy(submitButton, false, "Creating...", "Create note");
    }
}

// Task 3: DELETE a note.
async function deleteNote(note, item, button) {
    if (button.disabled) return;

    setBusy(button, true, "Deleting...", "Delete");

    try {
        const result = await request(`${API_URL}/${encodeURIComponent(note.id)}`, {
            method: "DELETE"
        });

        item.remove();

        if (!notesList.querySelector("li")) {
            renderNotes([]);
        }

        setStatus(
            `Note ${note.id} deleted (status ${result.status}).`,
            "success"
        );
    } catch (error) {
        setStatus(error.message || "Unable to delete the note.", "error");
        setBusy(button, false, "Deleting...", "Delete");
    }
}

loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);