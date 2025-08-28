// Firebase modules are exposed globally by index.html for easier access in script.js
const {
    initializeApp,
    getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword,
    getFirestore, collection, addDoc, doc, getDoc, updateDoc, deleteDoc, onSnapshot, query
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
let unsubscribeFromTasks = null; // To store the onSnapshot listener

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
    toggleAuthModeButton.innerHTML = 'Sign Up'; // Use innerHTML to render the link correctly
    authForm.reset();
    hideErrorMessage(authError);
    showSection(authSection);
}

function showSignupView() {
    currentView = 'auth';
    isLoginMode = false;
    authTitle.textContent = 'Sign Up';
    authSubmitButton.textContent = 'Sign Up';
    toggleAuthModeButton.innerHTML = 'Login';
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
        // Set default due date to today for convenience
        const today = new Date();
        taskDueDateInput.value = today.toISOString().split('T')[0];
    }
    showSection(taskFormSection);
}

function showConfirmationModal(message, onConfirm) {
    modalMessage.textContent = message;
    confirmationModal.classList.remove('hidden');

    // Use .once for event listeners to avoid multiple calls
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
        // This configuration should be your actual Firebase project config.
        const firebaseConfig = {
            apiKey: "AIzaSyAwR72pM7NIhrjdgwQYLkcwHLyXkM2IdCg",
            authDomain: "taskflow-283a5.firebaseapp.com",
            projectId: "taskflow-283a5",
            storageBucket: "taskflow-283a5.firebasestorage.app",
            messagingSenderId: "178065437443",
            appId: "1:178065437443:web:756b219b7be05cbe758216",
            measurementId: "G-XW9QZ239E5"
        };


        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUserId = user.uid;
                currentUserEmail = user.email || 'Anonymous';
                userIdDisplay.querySelector('span').textContent = currentUserEmail;
                userIdDisplay.classList.remove('hidden');
                logoutButton.classList.remove('hidden');
                console.log("User signed in:", currentUserId, currentUserEmail);
                isAuthReady = true;
                showListView();
            } else {
                currentUserId = null;
                currentUserEmail = 'Anonymous';
                userIdDisplay.classList.add('hidden');
                logoutButton.classList.add('hidden');
                console.log("User signed out or not authenticated.");
                isAuthReady = true;
                showLoginView();
                // If there's an active listener, unsubscribe when logging out
                if (unsubscribeFromTasks) {
                    unsubscribeFromTasks();
                }
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
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
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
        } catch (error) {
            console.error("Error signing out:", error);
        }
    }
}

function renderTasks() {
    if (!db || !isAuthReady || !currentUserId) {
        return;
    }
    
    // If a listener is already active, detach it before creating a new one
    if (unsubscribeFromTasks) {
        unsubscribeFromTasks();
    }

    // CORRECTED PATH: This path is standard for storing user-specific data.
    const collectionPath = `users/${currentUserId}/tasks`;
    const q = query(collection(db, collectionPath));

    // Listen for real-time updates
    unsubscribeFromTasks = onSnapshot(q, (snapshot) => {
        hideErrorMessage(listError);
        let tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
                    return (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0);
                case 'createdAtAsc':
                    return (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0);
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
                const createdAtDate = task.createdAt?.toDate ? task.createdAt.toDate().toLocaleDateString() : 'N/A';
                li.innerHTML = `
                    <div class="flex-content">
                        <h3>${task.title}</h3>
                        ${task.description ? `<p>${task.description}</p>` : ''}
                        <p class="date-info">
                            Created: ${createdAtDate}
                            ${task.dueDate ? ` | Due: ${task.dueDate}` : ''}
                        </p>
                    </div>
                    <div class="task-buttons">
                        <button data-id="${task.id}" class="toggle-completed-button ${task.completed ? 'unmark-button' : 'complete-button'}">
                            ${task.completed ? 'Unmark' : 'Complete'}
                        </button>
                        <button data-id="${task.id}" class="edit-task-button">Edit</button>
                        <button data-id="${task.id}" class="delete-task-button">Delete</button>
                    </div>
                `;
                tasksList.appendChild(li);
            });

            // Attach event listeners
            tasksList.querySelectorAll('.toggle-completed-button').forEach(button => {
                button.onclick = (e) => {
                    const taskItem = e.target.closest('.task-item');
                    const isCompleted = taskItem.classList.contains('completed');
                    toggleTaskCompleted(e.target.dataset.id, !isCompleted);
                };
            });
            tasksList.querySelectorAll('.edit-task-button').forEach(button => {
                button.onclick = (e) => showTaskForm(e.target.dataset.id);
            });
            tasksList.querySelectorAll('.delete-task-button').forEach(button => {
                button.onclick = (e) => confirmDeleteTask(e.target.dataset.id);
            });
        }
    }, (err) => {
        console.error("Firestore snapshot error:", err);
        showErrorMessage(listError, "Failed to fetch real-time updates for tasks.");
    });
}

async function loadTaskForEdit(taskId) {
    if (!db || !currentUserId) return;
    try {
        // CORRECTED PATH
        const docRef = doc(db, `users/${currentUserId}/tasks`, taskId);
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

    if (!db || !currentUserId) {
        showErrorMessage(formError, "Authentication not ready. Please wait.");
        saveTaskButton.disabled = false;
        return;
    }

    const taskId = taskIdInput.value;
    const title = taskTitleInput.value.trim();
    if (!title) {
        showErrorMessage(formError, "Task title cannot be empty.");
        saveTaskButton.disabled = false;
        return;
    }

    try {
        const taskData = {
            title,
            description: taskDescriptionInput.value.trim(),
            dueDate: taskDueDateInput.value,
            completed: taskCompletedInput.checked,
            updatedAt: new Date(),
        };

        // CORRECTED PATH
        const collectionPath = `users/${currentUserId}/tasks`;

        if (taskId) {
            const docRef = doc(db, collectionPath, taskId);
            await updateDoc(docRef, taskData);
        } else {
            taskData.createdAt = new Date();
            await addDoc(collection(db, collectionPath), taskData);
        }
        showListView();
    } catch (err) {
        console.error("Error saving task:", err);
        showErrorMessage(formError, "Failed to save task. Please try again.");
    } finally {
        saveTaskButton.disabled = false;
    }
}

async function toggleTaskCompleted(taskId, newCompletedStatus) {
    if (!db || !currentUserId) return;
    try {
        // CORRECTED PATH
        const docRef = doc(db, `users/${currentUserId}/tasks`, taskId);
        await updateDoc(docRef, { completed: newCompletedStatus, updatedAt: new Date() });
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
    if (!db || !currentUserId) return;
    hideErrorMessage(listError);
    try {
        // CORRECTED PATH
        const docRef = doc(db, `users/${currentUserId}/tasks`, taskId);
        await deleteDoc(docRef);
    } catch (err) {
        console.error("Error removing document: ", err);
        showErrorMessage(listError, "Failed to delete task.");
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', initializeFirebase);

authForm.addEventListener('submit', handleAuthFormSubmit);
toggleAuthModeButton.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode ? showSignupView() : showLoginView();
});

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

cancelTaskFormButton.addEventListener('click', showListView);
taskForm.addEventListener('submit', handleTaskFormSubmit);
