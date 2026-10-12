const STORAGE_KEY = "girlsHostelFees";

const feesForm = document.getElementById("feesForm");
const feesTableBody = document.getElementById("feesTableBody");

const studentNameInput = document.getElementById("studentName");
const studentIdInput = document.getElementById("studentId");
const roomNumberInput = document.getElementById("roomNumber");
const totalAmountInput = document.getElementById("totalAmount");
const paidAmountInput = document.getElementById("paidAmount");
const paymentDateInput = document.getElementById("paymentDate");
const paymentMethodInput = document.getElementById("paymentMethod");

const editIdInput = document.getElementById("editId");
const searchInput = document.getElementById("searchInput");
const remainingPreview = document.getElementById("remainingPreview");

const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelBtn");
const formTitle = document.getElementById("formTitle");
const emptyMessage = document.getElementById("emptyMessage");


// Load saved records safely

function loadFees() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) {
            return [];
        }

        const records = JSON.parse(savedData);

        if (!Array.isArray(records)) {
            return [];
        }

        return records.filter(record =>
            record &&
            typeof record.id === "string" &&
            typeof record.studentName === "string" &&
            typeof record.studentId === "string" &&
            typeof record.roomNumber === "string" &&
            Number.isFinite(record.totalAmount) &&
            Number.isFinite(record.paidAmount) &&
            record.totalAmount > 0 &&
            record.paidAmount >= 0 &&
            record.paidAmount <= record.totalAmount
        );

    } catch (error) {
        alert("Saved fees data could not be read.");
        console.error(error);
        return [];
    }
}

let feesRecords = loadFees();


// Save records in localStorage

function saveFees() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(feesRecords)
        );

        return true;

    } catch (error) {
        alert("Data could not be saved in this browser.");
        console.error(error);
        return false;
    }
}


// Format money in Indian Rupees

function formatMoney(amount) {
    return Number(amount).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2
    });
}


// Calculate remaining fees

function getRemaining(record) {
    return Math.max(0, record.totalAmount - record.paidAmount);
}


// Determine payment status

function getStatus(record) {
    if (record.paidAmount >= record.totalAmount) {
        return "Paid";
    }

    if (record.paidAmount > 0) {
        return "Partial";
    }

    return "Unpaid";
}


// Update remaining fees preview

function updateRemainingPreview() {
    const total = Number(totalAmountInput.value);
    const paid = Number(paidAmountInput.value);

    const remaining =
        Number.isFinite(total) && Number.isFinite(paid)
            ? Math.max(0, total - paid)
            : 0;

    remainingPreview.textContent = formatMoney(remaining);
}

totalAmountInput.addEventListener("input", updateRemainingPreview);
paidAmountInput.addEventListener("input", updateRemainingPreview);


// Update dashboard statistics

function updateDashboard() {
    const totalFees = feesRecords.reduce(
        (sum, record) => sum + record.totalAmount,
        0
    );

    const collectedFees = feesRecords.reduce(
        (sum, record) => sum + record.paidAmount,
        0
    );

    const pendingFees = feesRecords.reduce(
        (sum, record) => sum + getRemaining(record),
        0
    );

    document.getElementById("totalFees").textContent =
        formatMoney(totalFees);

    document.getElementById("collectedFees").textContent =
        formatMoney(collectedFees);

    document.getElementById("pendingFees").textContent =
        formatMoney(pendingFees);

    document.getElementById("totalStudents").textContent =
        feesRecords.length;
}


// Create safe HTML elements for table data

function createCell(text) {
    const cell = document.createElement("td");
    cell.textContent = text;
    return cell;
}


// Display records in table

function renderFees() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    const filteredRecords = feesRecords.filter(record => {
        return (
            record.studentName.toLowerCase().includes(searchTerm) ||
            record.studentId.toLowerCase().includes(searchTerm) ||
            record.roomNumber.toLowerCase().includes(searchTerm)
        );
    });

    feesTableBody.replaceChildren();

    emptyMessage.style.display =
        filteredRecords.length === 0 ? "block" : "none";

    filteredRecords.forEach(record => {
        const row = document.createElement("tr");

        row.appendChild(createCell(record.studentName));
        row.appendChild(createCell(record.studentId));
        row.appendChild(createCell(record.roomNumber));
        row.appendChild(createCell(formatMoney(record.totalAmount)));
        row.appendChild(createCell(formatMoney(record.paidAmount)));
        row.appendChild(createCell(formatMoney(getRemaining(record))));
        row.appendChild(createCell(record.paymentDate));
        row.appendChild(createCell(record.paymentMethod));

        const statusCell = document.createElement("td");
        const statusBadge = document.createElement("span");
        const status = getStatus(record);

        statusBadge.textContent = status;
        statusBadge.className = "status " + status.toLowerCase();

        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);

        // Action buttons

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.className = "action-btn edit-btn";
        editButton.type = "button";

        editButton.addEventListener("click", () => {
            editFees(record.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "action-btn delete-btn";
        deleteButton.type = "button";

        deleteButton.addEventListener("click", () => {
            deleteFees(record.id);
        });

        actionCell.append(editButton, deleteButton);
        row.appendChild(actionCell);

        feesTableBody.appendChild(row);
    });

    updateDashboard();
}


// Add or update a fee record

feesForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const studentName = studentNameInput.value.trim();
    const studentId = studentIdInput.value.trim();
    const roomNumber = roomNumberInput.value.trim();

    const totalAmount = Number(totalAmountInput.value);
    const paidAmount = Number(paidAmountInput.value);

    const paymentDate = paymentDateInput.value;
    const paymentMethod = paymentMethodInput.value;

    if (!studentName || !studentId || !roomNumber) {
        alert("Please fill in all student details.");
        return;
    }

    if (
        !Number.isFinite(totalAmount) ||
        !Number.isFinite(paidAmount) ||
        totalAmount <= 0 ||
        paidAmount < 0 ||
        paidAmount > totalAmount
    ) {
        alert("Please enter valid fees amounts. Paid amount cannot exceed total fees.");
        return;
    }

    if (!paymentDate || !paymentMethod) {
        alert("Please select payment date and method.");
        return;
    }

    const editId = editIdInput.value;

    // Prevent duplicate student IDs

    const duplicate = feesRecords.some(record =>
        record.studentId.toLowerCase() === studentId.toLowerCase() &&
        record.id !== editId
    );

    if (duplicate) {
        alert("This Student ID already exists in the fees records.");
        return;
    }

    let updatedRecords;

    if (editId) {
        updatedRecords = feesRecords.map(record => {
            if (record.id !== editId) {
                return record;
            }

            return {
                ...record,
                studentName,
                studentId,
                roomNumber,
                totalAmount,
                paidAmount,
                paymentDate,
                paymentMethod
            };
        });

    } else {
        const newRecord = {
            id: crypto.randomUUID(),
            studentName,
            studentId,
            roomNumber,
            totalAmount,
            paidAmount,
            paymentDate,
            paymentMethod
        };

        updatedRecords = [...feesRecords, newRecord];
    }

    const previousRecords = feesRecords;
    feesRecords = updatedRecords;

    if (!saveFees()) {
        feesRecords = previousRecords;
        return;
    }

    resetForm();
    renderFees();

    alert(editId ? "Fees record updated successfully!" : "Fees record saved successfully!");
});


// Edit record

function editFees(id) {
    const record = feesRecords.find(item => item.id === id);

    if (!record) {
        return;
    }

    editIdInput.value = record.id;

    studentNameInput.value = record.studentName;
    studentIdInput.value = record.studentId;
    roomNumberInput.value = record.roomNumber;
    totalAmountInput.value = record.totalAmount;
    paidAmountInput.value = record.paidAmount;
    paymentDateInput.value = record.paymentDate;
    paymentMethodInput.value = record.paymentMethod;

    formTitle.textContent = "Edit Student Fees";
    submitBtn.textContent = "Update Fees";
    cancelBtn.hidden = false;

    updateRemainingPreview();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// Delete record

function deleteFees(id) {
    const record = feesRecords.find(item => item.id === id);

    if (!record) {
        return;
    }

    const confirmed = confirm(
        `Delete fees record for ${record.studentName}?`
    );

    if (!confirmed) {
        return;
    }

    const previousRecords = feesRecords;

    feesRecords = feesRecords.filter(item => item.id !== id);

    if (!saveFees()) {
        feesRecords = previousRecords;
        return;
    }

    if (editIdInput.value === id) {
        resetForm();
    }

    renderFees();

    alert("Fees record deleted successfully!");
}


// Reset form

function resetForm() {
    feesForm.reset();

    editIdInput.value = "";

    paymentDateInput.value =
        new Date().toLocaleDateString("en-CA");

    paidAmountInput.value = "0";

    formTitle.textContent = "Add Student Fees";
    submitBtn.textContent = "Save Fees";
    cancelBtn.hidden = true;

    updateRemainingPreview();
}


// Cancel editing

cancelBtn.addEventListener("click", resetForm);


// Search records

searchInput.addEventListener("input", renderFees);


// Initial setup

resetForm();
renderFees();

// ==================================
// MONTHLY AND YEARLY FEES REPORT
// ==================================

const reportType = document.getElementById("reportType");
const reportMonth = document.getElementById("reportMonth");
const reportYear = document.getElementById("reportYear");
const monthFilter = document.getElementById("monthFilter");

const generateReportBtn =
    document.getElementById("generateReportBtn");

const printReportBtn =
    document.getElementById("printReportBtn");

const reportTableBody =
    document.getElementById("reportTableBody");

const reportEmptyMessage =
    document.getElementById("reportEmptyMessage");


// Fill year dropdown

function setupReportYears() {
    const currentYear = new Date().getFullYear();

    reportYear.replaceChildren();

    for (let year = currentYear; year >= currentYear - 10; year--) {
        const option = document.createElement("option");

        option.value = String(year);
        option.textContent = String(year);

        reportYear.appendChild(option);
    }

    reportMonth.value =
        String(new Date().getMonth() + 1).padStart(2, "0");
}


// Show or hide month filter

reportType.addEventListener("change", function() {
    monthFilter.style.display =
        reportType.value === "monthly" ? "flex" : "none";
});


// Generate report

function generateFeesReport() {
    const type = reportType.value;
    const selectedMonth = reportMonth.value;
    const selectedYear = reportYear.value;

    // Read the latest saved data

    let savedRecords = [];

    try {
        const rawData = localStorage.getItem("girlsHostelFees");

        savedRecords = rawData ? JSON.parse(rawData) : [];

        if (!Array.isArray(savedRecords)) {
            savedRecords = [];
        }
    } catch (error) {
        alert("Unable to read saved fees records.");
        return;
    }

    // Select records for the chosen period

    const filteredRecords = savedRecords.filter(record => {
        if (
            !record ||
            typeof record.paymentDate !== "string" ||
            !Number.isFinite(record.totalAmount) ||
            !Number.isFinite(record.paidAmount)
        ) {
            return false;
        }

        const parts = record.paymentDate.split("-");

        if (parts.length !== 3) {
            return false;
        }

        const [year, month, day] = parts;

        if (
            !/^\d{4}$/.test(year) ||
            !/^\d{2}$/.test(month) ||
            !/^\d{2}$/.test(day)
        ) {
            return false;
        }

        if (
            Number(month) < 1 ||
            Number(month) > 12 ||
            Number(day) < 1 ||
            Number(day) > 31
        ) {
            return false;
        }

        if (year !== selectedYear) {
            return false;
        }

        if (type === "monthly" && month !== selectedMonth) {
            return false;
        }

        return true;
    });

    // Calculate summary

    const totalFees = filteredRecords.reduce(
        (sum, record) => sum + record.totalAmount,
        0
    );

    const collectedFees = filteredRecords.reduce(
        (sum, record) => sum + record.paidAmount,
        0
    );

    const pendingFees = filteredRecords.reduce(
        (sum, record) => sum +
            Math.max(0, record.totalAmount - record.paidAmount),
        0
    );

    document.getElementById("reportTotalFees").textContent =
        formatMoney(totalFees);

    document.getElementById("reportCollectedFees").textContent =
        formatMoney(collectedFees);

    document.getElementById("reportPendingFees").textContent =
        formatMoney(pendingFees);

    // Display records

    reportTableBody.replaceChildren();

    reportEmptyMessage.style.display =
        filteredRecords.length === 0 ? "block" : "none";

    filteredRecords.forEach(record => {
        const row = document.createElement("tr");

        const values = [
            record.studentName || "",
            record.studentId || "",
            record.paymentDate,
            formatMoney(record.totalAmount),
            formatMoney(record.paidAmount),
            formatMoney(
                Math.max(0, record.totalAmount - record.paidAmount)
            )
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        reportTableBody.appendChild(row);
    });
}


// Generate report button

generateReportBtn.addEventListener(
    "click",
    generateFeesReport
);


// Print report

printReportBtn.addEventListener("click", function() {
    generateFeesReport();
    window.print();
});


// Initial setup

setupReportYears();
generateFeesReport();