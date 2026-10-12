// Girls Hostel Complaint Management System

const STORAGE_KEY = "girlsHostelComplaints";

const complaintForm = document.getElementById("complaintForm");
const complaintTableBody = document.getElementById("complaintTableBody");
const searchInput = document.getElementById("searchComplaint");

const totalComplaints = document.getElementById("totalComplaints");
const pendingComplaints = document.getElementById("pendingComplaints");
const resolvedComplaints = document.getElementById("resolvedComplaints");

let complaints = loadComplaints();


// Load complaints from localStorage

function loadComplaints() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) {
            return [];
        }

        const data = JSON.parse(savedData);

        return Array.isArray(data) ? data : [];

    } catch (error) {
        console.error("Unable to load complaints:", error);
        alert("Complaint data could not be loaded.");
        return [];
    }
}


// Save complaints

function saveComplaints() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(complaints)
        );

        return true;

    } catch (error) {
        console.error("Unable to save complaints:", error);
        alert("Complaint could not be saved in this browser.");
        return false;
    }
}


// Add a new complaint

complaintForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const studentName =
        document.getElementById("studentName").value.trim();

    const studentId =
        document.getElementById("studentId").value.trim();

    const roomNumber =
        document.getElementById("roomNumber").value.trim();

    const category =
        document.getElementById("complaintCategory").value;

    const description =
        document.getElementById("complaintDescription").value.trim();

    if (
        !studentName ||
        !studentId ||
        !roomNumber ||
        !category ||
        !description
    ) {
        alert("Please fill in all complaint details.");
        return;
    }

    const complaint = {
        id: createComplaintId(),
        studentName,
        studentId,
        roomNumber,
        category,
        description,
        status: "Pending",
        createdAt: new Date().toISOString()
    };

    complaints.push(complaint);

    if (!saveComplaints()) {
        complaints.pop();
        return;
    }

    complaintForm.reset();

    renderComplaints();

    alert("Complaint submitted successfully!");
});


// Create an ID for each complaint

function createComplaintId() {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return "CMP-" + Date.now() + "-" +
        Math.random().toString(36).slice(2, 8);
}


// Create a safe table cell

function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value;
    return cell;
}


// Display complaints

function renderComplaints() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    const filteredComplaints = complaints.filter(complaint => {
        return (
            complaint.studentName.toLowerCase().includes(searchTerm) ||
            complaint.studentId.toLowerCase().includes(searchTerm) ||
            complaint.roomNumber.toLowerCase().includes(searchTerm) ||
            complaint.category.toLowerCase().includes(searchTerm) ||
            complaint.status.toLowerCase().includes(searchTerm)
        );
    });

    complaintTableBody.replaceChildren();

    filteredComplaints.forEach(complaint => {
        const row = document.createElement("tr");

        row.appendChild(createCell(complaint.id.slice(0, 12)));
        row.appendChild(createCell(complaint.studentName));
        row.appendChild(createCell(complaint.studentId));
        row.appendChild(createCell(complaint.roomNumber));
        row.appendChild(createCell(complaint.category));
        row.appendChild(createCell(complaint.description));
        row.appendChild(createCell(formatDate(complaint.createdAt)));

        const statusCell = document.createElement("td");
        const statusBadge = document.createElement("span");

        statusBadge.textContent = complaint.status;
        statusBadge.className =
            "complaint-status " + complaint.status.toLowerCase();

        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);

        // Status button

        const actionCell = document.createElement("td");
        const statusButton = document.createElement("button");

        statusButton.type = "button";
        statusButton.className = "resolve-btn";

        if (complaint.status === "Resolved") {
            statusButton.textContent = "Reopen";

            statusButton.addEventListener("click", function() {
                updateComplaintStatus(complaint.id, "Pending");
            });
        } else {
            statusButton.textContent = "Resolve";

            statusButton.addEventListener("click", function() {
                updateComplaintStatus(complaint.id, "Resolved");
            });
        }

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", function() {
            deleteComplaint(complaint.id);
        });

        actionCell.append(statusButton, deleteButton);
        row.appendChild(actionCell);

        complaintTableBody.appendChild(row);
    });

    updateComplaintStats();
}


// Update complaint status

function updateComplaintStatus(id, newStatus) {
    const index = complaints.findIndex(item => item.id === id);

    if (index === -1) {
        return;
    }

    const previousStatus = complaints[index].status;

    complaints[index].status = newStatus;

    if (!saveComplaints()) {
        complaints[index].status = previousStatus;
        return;
    }

    renderComplaints();
}


// Delete a complaint

function deleteComplaint(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this complaint?"
    );

    if (!confirmed) {
        return;
    }

    const previousComplaints = complaints;

    complaints = complaints.filter(item => item.id !== id);

    if (!saveComplaints()) {
        complaints = previousComplaints;
        return;
    }

    renderComplaints();

    alert("Complaint deleted successfully.");
}


// Search complaints

searchInput.addEventListener("input", renderComplaints);


// Format date

function formatDate(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "Unknown";
    }

    return date.toLocaleDateString("en-IN");
}


// Update dashboard statistics

function updateComplaintStats() {
    totalComplaints.textContent = complaints.length;

    pendingComplaints.textContent = complaints.filter(
        complaint => complaint.status === "Pending"
    ).length;

    resolvedComplaints.textContent = complaints.filter(
        complaint => complaint.status === "Resolved"
    ).length;
}


// Initial rendering

renderComplaints();