// Import Firebase configuration
import { auth, db } from "firebase.js";

// Import Authentication functions
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

// Import Firestore functions
import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";


// Display success and error messages
function showMessage(message, isError = false) {
    const messageElement = document.getElementById("message");

    if (!messageElement) {
        return;
    }

    messageElement.textContent = message;

    messageElement.style.color = isError
        ? "red"
        : "green";
}


// Convert Firebase errors into readable messages
function getErrorMessage(error) {
    switch (error.code) {
        case "auth/email-already-in-use":
            return "This email is already registered.";

        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/weak-password":
            return "Please choose a stronger password.";

        case "auth/invalid-credential":
            return "Incorrect email or password.";

        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";

        case "permission-denied":
        case "firestore/permission-denied":
            return "Database permission denied. Check Firestore rules.";

        default:
            console.error("Firebase error:", error);

            return "Something went wrong. Please check your Firebase setup.";
    }
}


// =====================================
// STUDENT SIGNUP
// =====================================

const signupForm = document.getElementById("signupForm");

if (signupForm) {

    signupForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        // Get form values
        const name = document
            .getElementById("name")
            .value
            .trim();

        const email = document
            .getElementById("email")
            .value
            .trim();

        const password = document
            .getElementById("password")
            .value;

        const confirmPassword = document
            .getElementById("confirmPassword")
            .value;


        // Validate student name
        if (!name) {
            showMessage(
                "Please enter your student name.",
                true
            );

            return;
        }


        // Validate password length
        if (password.length < 6) {
            showMessage(
                "Password must contain at least 6 characters.",
                true
            );

            return;
        }


        // Confirm password validation
        if (password !== confirmPassword) {
            showMessage(
                "Passwords do not match.",
                true
            );

            return;
        }


        // Disable button during signup
        const submitButton = signupForm.querySelector(
            'button[type="submit"]'
        );

        submitButton.disabled = true;

        showMessage("Creating your account...");


        try {

            // Create Firebase Authentication account
            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = userCredential.user;


            // Save student profile in Firestore
            await setDoc(
                doc(db, "users", user.uid),
                {
                    name: name,
                    email: user.email,
                    role: "student",
                    createdAt: serverTimestamp()
                }
            );


            // Redirect to dashboard
            window.location.replace("dashboard.html");


        } catch (error) {

            showMessage(
                getErrorMessage(error),
                true
            );

            console.error("Signup error:", error);

        } finally {

            submitButton.disabled = false;

        }

    });

}


// =====================================
// STUDENT LOGIN
// =====================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();


        // Get email and password
        const email = document
            .getElementById("email")
            .value
            .trim();

        const password = document
            .getElementById("password")
            .value;


        const submitButton = loginForm.querySelector(
            'button[type="submit"]'
        );

        submitButton.disabled = true;

        showMessage("Logging in...");


        try {

            // Sign in using Firebase Authentication
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


            // Redirect after successful login
            window.location.replace("dashboard.html");


        } catch (error) {

            showMessage(
                getErrorMessage(error),
                true
            );

            console.error("Login error:", error);

        } finally {

            submitButton.disabled = false;

        }

    });

}


// =====================================
// DASHBOARD LOGIN PROTECTION
// =====================================

// This part runs only on dashboard.html
if (
    window.location.pathname.endsWith("/dashboard.html") ||
    window.location.pathname === "/dashboard.html"
) {

    onAuthStateChanged(auth, function (user) {

        if (!user) {

            // Redirect unauthenticated users
            window.location.replace("login.html");

        }

    });

}