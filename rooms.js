import { auth, db } from "firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";


// HTML elements
const roomForm = document.getElementById("roomForm");
const roomIdInput = document.getElementById("roomId");
const roomNumberInput = document.getElementById("roomNumber");
const roomCapacityInput = document.getElementById("roomCapacity");
const occupiedBedsInput = document.getElementById("occupiedBedsInput");

const availablePreview = document.getElementById("availablePreview");
const roomFormTitle = document.getElementById("roomFormTitle");
const saveRoomButton = document.getElementById("saveRoomButton");
const cancelRoomEdit = document.getElementById("cancelRoomEdit");

const roomMessage = document.getElementById("roomMessage");
const roomTableBody = document.getElementById("roomTableBody");
const searchRoomInput = document.getElementById("searchRoom");
const roomCount = document.getElementById("roomCount");

let currentUser = null;
let rooms = [];
let isSaving = false;


// Show messages
function showMessage(message, isError = false) {
    roomMessage.textContent = message;
    roomMessage.style.color = isError ? "#c62828" : "#218838";
}


// Get integer input
function getInteger(value) {
    return Number(value);
}


// Calculate available beds
function calculateAvailableBeds(capacity, occupied) {
    return capacity - occupied;
}


// Update preview while entering values
function updateAvailablePreview() {
    const capacity = getInteger(roomCapacityInput.value);
    const occupied = getInteger(occupiedBedsInput.value);

    if (
        roomCapacityInput.value === "" ||
        occupiedBedsInput.value === "" ||
        !Number.isInteger(capacity) ||
        !Number.isInteger(occupied) ||
        capacity < 1 ||
        occupied < 0 ||
        occupied > capacity
    ) {
        availablePreview.textContent = "Invalid";
        return;
    }

    availablePreview.textContent =
        calculateAvailableBeds(capacity, occupied);
}

roomCapacityInput.addEventListener(
    "input",
    updateAvailablePreview
);

occupiedBedsInput.addEventListener(
    "input",
    updateAvailablePreview
);


// Update summary statistics
function updateRoomStatistics() {
    const totalRooms = rooms.length;

    const totalBeds = rooms.reduce(
        (sum, room) => sum + Number(room.capacity || 0),
        0
    );

    const occupiedBeds = rooms.reduce(
        (sum, room) => sum + Number(room.occupiedBeds || 0),
        0
    );

    const availableBeds = totalBeds - occupiedBeds;

    document.getElementById("totalRooms").textContent = totalRooms;
    document.getElementById("totalBeds").textContent = totalBeds;
    document.getElementById("occupiedBeds").textContent = occupiedBeds;
    document.getElementById("availableBeds").textContent = availableBeds;
}


// Reset form
function resetRoomForm() {
    roomForm.reset();

    roomIdInput.value = "";
    occupiedBedsInput.value = "0";

    roomFormTitle.textContent = "Add New Room";
    saveRoomButton.textContent = "Add Room";
    cancelRoomEdit.hidden = true;

    updateAvailablePreview();
}


// Load rooms belonging to the signed-in account
async function loadRooms() {
    if (!currentUser) return;

    roomTableBody.innerHTML =
        '<tr><td colspan="5">Loading rooms...</td></tr>';

    try {
        const roomsQuery = query(
            collection(db, "rooms"),
            where("ownerUid", "==", currentUser.uid)
        );

        const snapshot = await getDocs(roomsQuery);

        rooms = snapshot.docs.map(function (roomDocument) {
            return {
                id: roomDocument.id,
                ...roomDocument.data()
            };
        });

        renderRooms();
        updateRoomStatistics();

    } catch (error) {
        console.error("Load rooms error:", error);

        roomTableBody.innerHTML =
            '<tr><td colspan="5">Unable to load rooms. Check Firestore rules.</td></tr>';

        showMessage("Could not load room records.", true);
    }
}


// Render room table and search results
function renderRooms() {
    const searchText = searchRoomInput.value
        .trim()
        .toLowerCase();

    const filteredRooms = rooms.filter(function (room) {
        return String(room.roomNumber || "")
            .toLowerCase()
            .includes(searchText);
    });

    roomTableBody.replaceChildren();

    if (filteredRooms.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;

        cell.textContent = searchText
            ? "No matching rooms found."
            : "No rooms added yet.";

        row.appendChild(cell);
        roomTableBody.appendChild(row);

    } else {
        filteredRooms.forEach(function (room) {
            const row = document.createElement("tr");

            const available = calculateAvailableBeds(
                Number(room.capacity),
                Number(room.occupiedBeds)
            );

            const values = [
                room.roomNumber,
                room.capacity,
                room.occupiedBeds,
                available
            ];

            values.forEach(function (value) {
                const cell = document.createElement("td");
                cell.textContent = String(value);
                row.appendChild(cell);
            });

            const actionsCell = document.createElement("td");

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "room-edit-button";
            editButton.textContent = "Edit";

            editButton.addEventListener("click", function () {
                editRoom(room.id);
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "room-delete-button";
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", function () {
                deleteRoom(room.id);
            });

            actionsCell.append(editButton, deleteButton);
            row.appendChild(actionsCell);

            roomTableBody.appendChild(row);
        });
    }

    roomCount.textContent =
        `Total Rooms: ${rooms.length} | Showing: ${filteredRooms.length}`;
}


// Add or update room
roomForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!currentUser || isSaving) return;

    const roomNumber = roomNumberInput.value.trim();
    const capacity = getInteger(roomCapacityInput.value);
    const occupiedBeds = getInteger(occupiedBedsInput.value);
    const roomId = roomIdInput.value;

    if (!roomNumber) {
        showMessage("Please enter a room number.", true);
        return;
    }

    if (
        !Number.isInteger(capacity) ||
        capacity < 1 ||
        capacity > 100
    ) {
        showMessage(
            "Room capacity must be between 1 and 100.",
            true
        );
        return;
    }

    if (
        !Number.isInteger(occupiedBeds) ||
        occupiedBeds < 0 ||
        occupiedBeds > capacity
    ) {
        showMessage(
            "Occupied beds must be between 0 and room capacity.",
            true
        );
        return;
    }

    // Room numbers must be unique within this owner's records.
    const duplicateRoom = rooms.some(function (room) {
        return room.roomNumber.toLowerCase() === roomNumber.toLowerCase()
            && room.id !== roomId;
    });

    if (duplicateRoom) {
        showMessage(
            "This room number already exists.",
            true
        );
        return;
    }

    const roomData = {
        roomNumber,
        capacity,
        occupiedBeds,
        availableBeds: calculateAvailableBeds(
            capacity,
            occupiedBeds
        )
    };

    isSaving = true;
    saveRoomButton.disabled = true;

    try {
        if (roomId) {
            const existingRoom = rooms.find(
                room => room.id === roomId
            );

            if (!existingRoom) {
                showMessage("Room record not found.", true);
                return;
            }

            await updateDoc(
                doc(db, "rooms", roomId),
                {
                    ...roomData,
                    updatedAt: serverTimestamp()
                }
            );

            showMessage("Room updated successfully!");

        } else {
            await addDoc(collection(db, "rooms"), {
                ...roomData,
                ownerUid: currentUser.uid,
                createdAt: serverTimestamp()
            });

            showMessage("Room added successfully!");
        }

        resetRoomForm();
        await loadRooms();

    } catch (error) {
        console.error("Save room error:", error);

        showMessage(
            "Unable to save room. Check Firestore security rules.",
            true
        );

    } finally {
        isSaving = false;
        saveRoomButton.disabled = false;
    }
});


// Edit room
function editRoom(roomId) {
    const room = rooms.find(item => item.id === roomId);

    if (!room) {
        showMessage("Room record not found.", true);
        return;
    }

    roomIdInput.value = room.id;
    roomNumberInput.value = room.roomNumber || "";
    roomCapacityInput.value = room.capacity;
    occupiedBedsInput.value = room.occupiedBeds;

    roomFormTitle.textContent = "Edit Room";
    saveRoomButton.textContent = "Update Room";
    cancelRoomEdit.hidden = false;

    updateAvailablePreview();

    roomForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// Delete room
async function deleteRoom(roomId) {
    if (!currentUser) return;

    const room = rooms.find(item => item.id === roomId);

    if (!room) {
        showMessage("Room record not found.", true);
        return;
    }

    if (Number(room.occupiedBeds) > 0) {
        showMessage(
            "This room has occupied beds. Move the students first.",
            true
        );
        return;
    }

    const confirmed = window.confirm(
        `Delete room ${room.roomNumber}? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
        await deleteDoc(doc(db, "rooms", roomId));

        if (roomIdInput.value === roomId) {
            resetRoomForm();
        }

        showMessage("Room deleted successfully!");

        await loadRooms();

    } catch (error) {
        console.error("Delete room error:", error);

        showMessage(
            "Unable to delete room. Check Firestore security rules.",
            true
        );
    }
}


// Search rooms
searchRoomInput.addEventListener("input", renderRooms);


// Cancel editing
cancelRoomEdit.addEventListener("click", function () {
    resetRoomForm();
    showMessage("Room edit cancelled.");
});


// Authentication check
onAuthStateChanged(auth, async function (user) {
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    currentUser = user;

    await loadRooms();
});


