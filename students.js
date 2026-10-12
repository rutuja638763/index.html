import { auth, db } from "./firebase.js";

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
const studentForm = document.getElementById("studentForm");
const studentIdInput = document.getElementById("studentId");
const studentNameInput = document.getElementById("studentName");
const studentEmailInput = document.getElementById("studentEmail");
const studentPhoneInput = document.getElementById("studentPhone");
const roomNumberInput = document.getElementById("roomNumber");

const studentTableBody = document.getElementById("studentTableBody");
const searchStudentInput = document.getElementById("searchStudent");
const studentMessage = document.getElementById("studentMessage");
const studentCount = document.getElementById("studentCount");

const saveButton = document.getElementById("saveButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const formTitle = document.getElementById("formTitle");

let currentUser = null;
let students = [];
let isSaving = false;


// Show message
function showMessage(message, isError = false) {
    studentMessage.textContent = message;
    studentMessage.style.color = isError ? "#c62828" : "#218838";
}


// Escape text before displaying user-provided data in HTML
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}


// Reset form
function resetForm() {
    studentForm.reset();
    studentIdInput.value = "";

    formTitle.textContent = "Add New Student";
    saveButton.textContent = "Add Student";
    cancelEditButton.hidden = true;
}


// Load students belonging to the signed-in account.
// This version uses an owner field, so students are private to the creator.
async function loadStudents() {
    if (!currentUser) return;

    studentTableBody.innerHTML =
        '<tr><td colspan="5">Loading students...</td></tr>';

    try {
        const studentsQuery = query(
            collection(db, "students"),
            where("ownerUid", "==", currentUser.uid)
        );

        const snapshot = await getDocs(studentsQuery);

        students = snapshot.docs.map(function (studentDocument) {
            return {
                id: studentDocument.id,
                ...studentDocument.data()
            };
        });

        renderStudents();

    } catch (error) {
        console.error("Load students error:", error);

        studentTableBody.innerHTML =
            '<tr><td colspan="5">Unable to load students. Check Firestore security rules.</td></tr>';

        showMessage("Could not load student records.", true);
    }
}


// Render table and search results
function renderStudents() {
    const searchText = searchStudentInput.value
        .trim()
        .toLowerCase();

    const filteredStudents = students.filter(function (student) {
        return [
            student.name,
            student.email,
            student.phone,
            student.roomNumber
        ].some(function (value) {
            return String(value ?? "")
                .toLowerCase()
                .includes(searchText);
        });
    });

    studentTableBody.replaceChildren();

    if (filteredStudents.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = searchText
            ? "No matching students found."
            : "No students added yet.";

        row.appendChild(cell);
        studentTableBody.appendChild(row);

    } else {
        filteredStudents.forEach(function (student) {
            const row = document.createElement("tr");

            const values = [
                student.name,
                student.email,
                student.phone,
                student.roomNumber
            ];

            values.forEach(function (value) {
                const cell = document.createElement("td");
                cell.textContent = String(value ?? "");
                row.appendChild(cell);
            });

            const actionsCell = document.createElement("td");

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "edit-button";
            editButton.textContent = "Edit";

            editButton.addEventListener("click", function () {
                editStudent(student.id);
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "delete-button";
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", function () {
                deleteStudent(student.id);
            });

            actionsCell.append(editButton, deleteButton);
            row.appendChild(actionsCell);

            studentTableBody.appendChild(row);
        });
    }

    studentCount.textContent =
        `Total Students: ${students.length} | Showing: ${filteredStudents.length}`;
}


// Add or update student
studentForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!currentUser || isSaving) return;

    const name = studentNameInput.value.trim();
    const email = studentEmailInput.value.trim();
    const phone = studentPhoneInput.value.trim();
    const roomNumber = roomNumberInput.value.trim();
    const studentId = studentIdInput.value;

    if (!name || !email || !phone || !roomNumber) {
        showMessage("Please fill in all fields.", true);
        return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
        showMessage("Enter a valid 10-digit phone number.", true);
        return;
    }

    const studentData = {
        name,
        email,
        phone,
        roomNumber
    };

    isSaving = true;
    saveButton.disabled = true;

    try {
        if (studentId) {
            // Only update a record owned by the current user.
            const existingStudent = students.find(
                student => student.id === studentId
            );

            if (!existingStudent) {
                showMessage("Student record not found.", true);
                return;
            }

            await updateDoc(
                doc(db, "students", studentId),
                {
                    ...studentData,
                    updatedAt: serverTimestamp()
                }
            );

            showMessage("Student updated successfully!");

        } else {
            await addDoc(collection(db, "students"), {
                ...studentData,
                ownerUid: currentUser.uid,
                createdAt: serverTimestamp()
            });

            showMessage("Student added successfully!");
        }

        resetForm();
        await loadStudents();

    } catch (error) {
        console.error("Save student error:", error);

        showMessage(
            "Unable to save student. Check Firestore security rules.",
            true
        );

    } finally {
        isSaving = false;
        saveButton.disabled = false;
    }
});


// Edit student
function editStudent(studentId) {
    const student = students.find(function (item) {
        return item.id === studentId;
    });

    if (!student) {
        showMessage("Student record not found.", true);
        return;
    }

    studentIdInput.value = student.id;
    studentNameInput.value = student.name || "";
    studentEmailInput.value = student.email || "";
    studentPhoneInput.value = student.phone || "";
    roomNumberInput.value = student.roomNumber || "";

    formTitle.textContent = "Edit Student";
    saveButton.textContent = "Update Student";
    cancelEditButton.hidden = false;

    studentForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// Delete student
async function deleteStudent(studentId) {
    if (!currentUser) return;

    const student = students.find(
        item => item.id === studentId
    );

    if (!student) {
        showMessage("Student record not found.", true);
        return;
    }

    const confirmed = window.confirm(
        `Delete student "${student.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
        await deleteDoc(doc(db, "students", studentId));

        if (studentIdInput.value === studentId) {
            resetForm();
        }

        showMessage("Student deleted successfully!");

        await loadStudents();

    } catch (error) {
        console.error("Delete student error:", error);

        showMessage(
            "Unable to delete student. Check Firestore security rules.",
            true
        );
    }
}


// Search students
searchStudentInput.addEventListener("input", renderStudents);


// Cancel editing
cancelEditButton.addEventListener("click", function () {
    resetForm();
    showMessage("Edit cancelled.");
});


// Check login before loading student records
onAuthStateChanged(auth, async function (user) {
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    currentUser = user;

    await loadStudents();
});