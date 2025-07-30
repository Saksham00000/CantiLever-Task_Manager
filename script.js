// Firebase modules are exposed globally by index.html for easier access in script.js
const {
    initializeApp,
    getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword,
    getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, onSnapshot, query, where
} = window.firebase;

// --- Global Variables ---
let app;
let db;
let auth;
let currentUserId = null;
let currentUserEmail = 'Anonymous';
let isAuthReady = false;
let currentView = 'auth'; // 'auth', 'list', 'form'
let selectedTaskId = null;
let currentFilter = 'all'; // 'all', 'active', 'completed'
let currentSortOrder = 'createdAtDesc'; // 'createdAtDesc', 'createdAtAsc', 'titleAsc', 'titleDesc'

// --- DOM Element References ---
const loadingMessage = document.getElementById('loadingMessage');
const userIdDisplay = document.getElementById('userIdDisplay');
const logoutButton = document.getElementById('logoutButton');

// Auth Section
const authSection = document.getElementById('authSection');
const authTitle = document.getElementById('authTitle');
const authForm = document.getElementById('authForm');
const authEmailInput = document.getElementById('authEmail');
const authPasswordInput = document.getElementById('authPassword');
const authSubmitButton = document.getElementById('authSubmitButton');
const authError = document.getElementById('authError');
const toggleAuthModeButton = document.getElementById('toggleAuthMode');
let isLoginMode = true; // true for login, false for signup

// Task List Section
const taskListSection = document.getElementById('taskListSection');
const addTaskButton = document.getElementById('addTaskButton');
const tasksList = document.getElementById('tasksList');
const noTasksMessage = document.getElementById('noTasksMessage');
const listError = document.getElementById('listError');
const filterAllButton = document.getElementById('filterAll');
const filterActiveButton = document.getElementById('filterActive');
const filterCompletedButton = document.getElementById('filterCompleted');
const sortOrderSelect = document.getElementById('sortOrder');

// Task Form Section
const taskFormSection = document.getElementById('taskFormSection');
const formTitle = document.getElementById('formTitle');
const taskForm = document.getElementById('taskForm');
const taskIdInput = document.getElementById('taskIdInput');
const taskTitleInput = document.getElementById('taskTitle');
const taskDescriptionInput = document.getElementById('taskDescription');
const taskDueDateInput = document.getElementById('taskDueDate');
const taskCompletedInput = document.getElementById('taskCompleted');
const cancelTaskFormButton = document.getElementById('cancelTaskFormButton');
const saveTaskButton = document.getElementById('saveTaskButton');
const formError = document.getElementById('formError');

// Confirmation Modal
const confirmationModal = document.getElementById('confirmationModal');
const modalMessage = document.getElementById('modalMessage');
const confirmCancelButton = document.getElementById('confirmCancelButton');
const confirmDeleteButton = document.getElementById('confirmDeleteButton');

// --- Helper Functions ---
function showErrorMessage(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
}

function hideErrorMessage(element) {
    element.classList.add('hidden');
    element.textContent = '';
}

function updateFilterButtons() {
    document.querySelectorAll('.filter-button').forEach(btn => {
        btn.classList.remove('active-filter');
    });
    if (currentFilter === 'all') {
        filterAllButton.classList.add('active-filter');
    } else if (currentFilter === 'active') {
        filterActiveButton.classList.add('active-filter');
    } else if (currentFilter === 'completed') {
        filterCompletedButton.classList.add('active-filter');
    }
}

// --- View Management Functions ---
function showSection(sectionElement) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.add('hidden');
    });
    loadingMessage.classList.add('hidden'); // Hide loading message once a section is shown
    sectionElement.classList.remove('hidden');
}

function showLoginView() {
    currentView = 'auth';
    isLoginMode = true;
    authTitle.textContent = 'Login';
    authSubmitButton.textContent = 'Login';
    toggleAuthModeButton.textContent = 'Sign Up';
    authForm.reset();
    hideErrorMessage(authError);
    showSection(authSection);
}

function showSignupView() {
    currentView = 'auth';
    isLoginMode = false;
    authTitle.textContent = 'Sign Up';
    authSubmitButton.textContent = 'Sign Up';
    toggleAuthModeButton.textContent = 'Login';
    authForm.reset();
    hideErrorMessage(authError);
    showSection(authSection);
}

function showListView() {
    currentView = 'list';
    showSection(taskListSection);
    renderTasks(); // Re-render tasks when returning to list
    updateFilterButtons(); // Ensure filter button state is correct
}

function showTaskForm(taskId = null) {
    currentView = 'form';
    selectedTaskId = taskId;
    hideErrorMessage(formError);
    taskForm.reset(); // Clear form fields
    taskCompletedInput.checked = false; // Ensure checkbox is reset

    if (taskId) {
        formTitle.textContent = 'Edit Task';
        saveTaskButton.textContent = 'Update Task';
        loadTaskForEdit(taskId);
    } else {
        formTitle.textContent = 'Add New Task';
        saveTaskButton.textContent = 'Save Task';
        // Set default due date to today + 7 days for convenience
        const today = new Date();
        const nextWeek = new Date(today.setDate(today.getDate() + 7));
        taskDueDateInput.value = nextWeek.toISOString().split('T')[0];
    }
    showSection(taskFormSection);
}

function showConfirmationModal(message, onConfirm) {
    modalMessage.textContent = message;
    confirmationModal.classList.remove('hidden');

    // Remove previous listeners to prevent multiple calls
    confirmDeleteButton.onclick = null;
    confirmCancelButton.onclick = null;

    confirmDeleteButton.onclick = () => {
        confirmationModal.classList.add('hidden');
        onConfirm(true);
    };
    confirmCancelButton.onclick = () => {
        confirmationModal.classList.add('hidden');
        onConfirm(false);
    };
}

// --- Firebase & CRUD Operations ---
async function initializeFirebase() {
    try {
        // IMPORTANT: For local VS Code, you'll need to replace these with your actual Firebase config
        // Example: const appId = 'your-actual-app-id';
        // Example: const firebaseConfig = { apiKey: "...", authDomain: "...", projectId: "...", ... };
        // If running in a Canvas environment, these will be provided.
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'task-manager-1ad5f';
        // For Firebase JS SDK v7.20.0 and later, measurementId is optional
        const firebaseConfig = {
            apiKey: "AIzaSyAJaf_CeOUAbCvGRvCbbkOrSHh6u-Jz2GM",
            authDomain: "task-manager-1ad5f.firebaseapp.com",
            projectId: "task-manager-1ad5f",
            storageBucket: "task-manager-1ad5f.firebasestorage.app",
            messagingSenderId: "871638110787",
            appId: "1:871638110787:web:ec6778ebc4ba4f4e7cfaf6",
            measurementId: "G-078G8QQFDC"
        };

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                currentUserEmail = user.email || 'Anonymous';
                userIdDisplay.querySelector('span').textContent = currentUserEmail; // Display email
                userIdDisplay.classList.remove('hidden');
                logoutButton.classList.remove('hidden');
                console.log("User signed in:", currentUserId, currentUserEmail);
                isAuthReady = true;
                showListView(); // Show task list after successful authentication
            } else {
                currentUserId = null;
                currentUserEmail = 'Anonymous';
                userIdDisplay.classList.add('hidden');
                logoutButton.classList.add('hidden');
                console.log("User signed out or not authenticated.");
                isAuthReady = true; // Auth system is ready, but no user logged in
                showLoginView(); // Show login/signup view
            }
        });
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        loadingMessage.textContent = "Error initializing application. Please try again.";
    }
}

async function handleAuthFormSubmit(event) {
    event.preventDefault();
    hideErrorMessage(authError);
    authSubmitButton.disabled = true;

    const email = authEmailInput.value;
    const password = authPasswordInput.value;

    if (!email || !password) {
        showErrorMessage(authError, "Email and password cannot be empty.");
        authSubmitButton.disabled = false;
        return;
    }

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
            console.log("User logged in successfully.");
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
            console.log("User signed up successfully.");
        }
        // onAuthStateChanged will handle view change
    } catch (error) {
        console.error("Authentication error:", error);
        let errorMessage = "An error occurred during authentication.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "Email already in use. Try logging in.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email address.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "Password should be at least 6 characters.";
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = "Invalid email or password.";
        }
        showErrorMessage(authError, errorMessage);
    } finally {
        authSubmitButton.disabled = false;
    }
}

async function handleLogout() {
    if (auth) {
        try {
            await signOut(auth);
            console.log("User signed out.");
            // onAuthStateChanged will handle view change to login
        } catch (error) {
            console.error("Error signing out:", error);
        }
    }
}

function renderTasks() {
    if (!db || !isAuthReady || !currentUserId) {
        showErrorMessage(listError, "Application not ready or user not authenticated. Please wait.");
        return;
    }

    // Define the collection path based on the user's authentication status.
    // For authenticated users, data is private to their UID.
    // For anonymous users (if enabled), a unique ID is used.
    const collectionPath = `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${currentUserId}/tasks`;
    const q = query(collection(db, collectionPath));

    // Listen for real-time updates
    onSnapshot(q, (snapshot) => {
        hideErrorMessage(listError);
        let tasksData = [];
        snapshot.docs.forEach(doc => {
            tasksData.push({ id: doc.id, ...doc.data() });
        });

        // Apply filtering
        if (currentFilter === 'active') {
            tasksData = tasksData.filter(task => !task.completed);
        } else if (currentFilter === 'completed') {
            tasksData = tasksData.filter(task => task.completed);
        }

        // Apply sorting
        tasksData.sort((a, b) => {
            switch (currentSortOrder) {
                case 'createdAtDesc':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'createdAtAsc':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'titleAsc':
                    return a.title.localeCompare(b.title);
                case 'titleDesc':
                    return b.title.localeCompare(a.title);
                default:
                    return 0;
            }
        });

        tasksList.innerHTML = ''; // Clear existing tasks

        if (tasksData.length === 0) {
            noTasksMessage.classList.remove('hidden');
        } else {
            noTasksMessage.classList.add('hidden');
            tasksData.forEach(task => {
                const li = document.createElement('li');
                li.className = `task-item ${task.completed ? 'completed' : ''}`;
                li.innerHTML = `
                    <div class="flex-content">
                        <h3>${task.title}</h3>
                        ${task.description ? `<p>${task.description}</p>` : ''}
                        <p class="date-info">
                            Created: ${new Date(task.createdAt).toLocaleDateString()}
                            ${task.dueDate ? ` | Due: ${new Date(task.dueDate).toLocaleDateString()}` : ''}
                        </p>
                    </div>
                    <div class="task-buttons">
                        <button data-id="${task.id}" data-completed="${task.completed}" class="toggle-completed-button ${task.completed ? 'unmark-button' : 'complete-button'}">
                            ${task.completed ? 'Unmark' : 'Complete'}
                        </button>
                        <button data-id="${task.id}" class="edit-task-button">
                            Edit
                        </button>
                        <button data-id="${task.id}" class="delete-task-button">
                            Delete
                        </button>
                    </div>
                `;
                tasksList.appendChild(li);
            });

            // Attach event listeners to newly created buttons
            document.querySelectorAll('.toggle-completed-button').forEach(button => {
                button.onclick = (e) => toggleTaskCompleted(e.target.dataset.id, e.target.dataset.completed === 'false');
            });
            document.querySelectorAll('.edit-task-button').forEach(button => {
                button.onclick = (e) => showTaskForm(e.target.dataset.id);
            });
            document.querySelectorAll('.delete-task-button').forEach(button => {
                button.onclick = (e) => confirmDeleteTask(e.target.dataset.id);
            });
        }
    }, (err) => {
        console.error("Firestore snapshot error:", err);
        showErrorMessage(listError, "Failed to fetch real-time updates for tasks.");
    });
}

async function loadTaskForEdit(taskId) {
    if (!db || !currentUserId || !isAuthReady) {
        showErrorMessage(formError, "Application not ready. Please wait.");
        return;
    }
    try {
        const docRef = doc(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${currentUserId}/tasks`, taskId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            taskIdInput.value = taskId;
            taskTitleInput.value = data.title;
            taskDescriptionInput.value = data.description || '';
            taskDueDateInput.value = data.dueDate || '';
            taskCompletedInput.checked = data.completed || false;
        } else {
            showErrorMessage(formError, "Task not found for editing.");
        }
    } catch (err) {
        console.error("Error fetching task for edit:", err);
        showErrorMessage(formError, "Failed to load task for editing.");
    }
}

async function handleTaskFormSubmit(event) {
    event.preventDefault();
    hideErrorMessage(formError);
    saveTaskButton.disabled = true;

    if (!db || !currentUserId || !isAuthReady) {
        showErrorMessage(formError, "Authentication not ready. Please wait.");
        saveTaskButton.disabled = false;
        return;
    }

    const taskId = taskIdInput.value;
    const title = taskTitleInput.value.trim();
    const description = taskDescriptionInput.value.trim();
    const dueDate = taskDueDateInput.value; // YYYY-MM-DD format
    const completed = taskCompletedInput.checked;

    if (!title) {
        showErrorMessage(formError, "Task title cannot be empty.");
        saveTaskButton.disabled = false;
        return;
    }

    try {
        const taskData = {
            title,
            description,
            dueDate,
            completed,
            updatedAt: new Date().toISOString(),
        };

        const collectionPath = `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${currentUserId}/tasks`;

        if (taskId) {
            // Update existing task
            const docRef = doc(db, collectionPath, taskId);
            await updateDoc(docRef, taskData);
            console.log("Task updated with ID: ", taskId);
        } else {
            // Add new task
            taskData.createdAt = new Date().toISOString(); // Set createdAt only for new tasks
            const collectionRef = collection(db, collectionPath);
            const docRef = await addDoc(collectionRef, taskData);
            console.log("New task added with ID: ", docRef.id);
        }
        showListView(); // Go back to list view after save
    } catch (err) {
        console.error("Error saving task:", err);
        showErrorMessage(formError, "Failed to save task. Please try again.");
    } finally {
        saveTaskButton.disabled = false;
    }
}

async function toggleTaskCompleted(taskId, newCompletedStatus) {
    if (!db || !currentUserId) {
        showErrorMessage(listError, "Authentication not ready to update task.");
        return;
    }
    try {
        const docRef = doc(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${currentUserId}/tasks`, taskId);
        await updateDoc(docRef, { completed: newCompletedStatus, updatedAt: new Date().toISOString() });
        console.log("Task completion status updated for ID:", taskId);
    } catch (err) {
        console.error("Error toggling task completion:", err);
        showErrorMessage(listError, "Failed to update task completion status.");
    }
}

function confirmDeleteTask(taskId) {
    showConfirmationModal("Are you sure you want to delete this task?", async (confirmed) => {
        if (confirmed) {
            await deleteTask(taskId);
        }
    });
}

async function deleteTask(taskId) {
    if (!db || !currentUserId) {
        showErrorMessage(listError, "Authentication not ready for delete.");
        return;
    }
    hideErrorMessage(listError);
    try {
        const docRef = doc(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${currentUserId}/tasks`, taskId);
        await deleteDoc(docRef);
        console.log("Document successfully deleted!");
        // renderTasks() will be triggered by onSnapshot
    } catch (err) {
        console.error("Error removing document: ", err);
        showErrorMessage(listError, "Failed to delete task.");
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', initializeFirebase);

// Authentication listeners
authForm.addEventListener('submit', handleAuthFormSubmit);
toggleAuthModeButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (isLoginMode) {
        showSignupView();
    } else {
        showLoginView();
    }
});

// Task list listeners
addTaskButton.addEventListener('click', () => showTaskForm());
logoutButton.addEventListener('click', handleLogout);

filterAllButton.addEventListener('click', () => {
    currentFilter = 'all';
    updateFilterButtons();
    renderTasks();
});

filterActiveButton.addEventListener('click', () => {
    currentFilter = 'active';
    updateFilterButtons();
    renderTasks();
});

filterCompletedButton.addEventListener('click', () => {
    currentFilter = 'completed';
    updateFilterButtons();
    renderTasks();
});

sortOrderSelect.addEventListener('change', (e) => {
    currentSortOrder = e.target.value;
    renderTasks();
});

// Task form listeners
cancelTaskFormButton.addEventListener('click', showListView);
taskForm.addEventListener('submit', handleTaskFormSubmit);
