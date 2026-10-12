import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const studentName = document.getElementById("studentName");
const studentRole = document.getElementById("studentRole");
const lastLoginMessage = document.getElementById("lastLoginMessage");
const logoutButton = document.getElementById("logoutButton");


// Update a dashboard statistic
function setStatistic(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = String(value);
    }
}


// Check login status
onAuthStateChanged(auth, async function (user) {

    if (!user) {
        window.location.replace("login.html");
        return;
    }

    studentName.textContent = user.email || "Student";
    studentRole.textContent = "Student";

    lastLoginMessage.textContent =
        "You are signed in as " + (user.email || "a student") + ".";

    try {

        // Read the signed-in user's profile
        const profileRef = doc(db, "users", user.uid);
        const profileSnapshot = await getDoc(profileRef);

        if (profileSnapshot.exists()) {

            const profile = profileSnapshot.data();

            studentName.textContent =
                profile.name || user.email || "Student";

            // Do not trust a role stored in an unsecured document.
            // This is display-only; real authorization must be enforced
            // using Firestore Security Rules.
            studentRole.textContent =
                profile.role === "admin" ? "Admin" : "Student";
        }

    } catch (error) {
        console.error("Profile loading error:", error);

        lastLoginMessage.textContent =
            "Signed in. Profile details could not be loaded.";
    }


    // Load simple counts from Firestore.
    // These require appropriate read permissions.
    try {

        const studentsSnapshot =
            await getDocs(collection(db, "users"));

        setStatistic(
            "totalStudents",
            studentsSnapshot.size
        );

    } catch (error) {

        console.error("Could not load students:", error);
        setStatistic("totalStudents", "—");
    }


    try {

        const roomsSnapshot =
            await getDocs(collection(db, "rooms"));

        setStatistic(
            "totalRooms",
            roomsSnapshot.size
        );

    } catch (error) {

        console.error("Could not load rooms:", error);
        setStatistic("totalRooms", "—");
    }


    try {

        const feesSnapshot =
            await getDocs(collection(db, "fees"));

        let pendingCount = 0;

        feesSnapshot.forEach(function (feeDocument) {
            const fee = feeDocument.data();

            if (fee.status === "pending") {
                pendingCount++;
            }
        });

        setStatistic("pendingFees", pendingCount);

    } catch (error) {

        console.error("Could not load fees:", error);
        setStatistic("pendingFees", "—");
    }


    try {

        const complaintsSnapshot =
            await getDocs(collection(db, "complaints"));

        setStatistic(
            "totalComplaints",
            complaintsSnapshot.size
        );

    } catch (error) {

        console.error("Could not load complaints:", error);
        setStatistic("totalComplaints", "—");
    }

});


// Logout
logoutButton.addEventListener("click", async function () {

    logoutButton.disabled = true;

    try {

        await signOut(auth);

        window.location.replace("login.html");

    } catch (error) {

        console.error("Logout error:", error);

        alert("Logout failed. Please try again.");

        logoutButton.disabled = false;
    }

});