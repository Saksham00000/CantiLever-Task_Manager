## Task Manager Website

This is a simple web-based Task Manager application that allows users to manage their tasks, including adding, editing, marking as complete, and deleting tasks. It features user authentication (login/signup) and stores task data in Firebase Firestore.

### Features

  * **User Authentication:** Users can sign up and log in with their email and password.
  * **Task Management:**
      * Add new tasks with a title, description, and due date.
      * Edit existing tasks.
      * Mark tasks as completed or unmark them.
      * Delete tasks.
  * **Task Filtering:** Filter tasks by "All", "Active", and "Completed" status.
  * **Task Sorting:** Sort tasks by creation date (newest/oldest first) and title (A-Z/Z-A).
  * **Persistent Storage:** Task data is stored securely in Firebase Firestore, associated with the authenticated user.
  * **Responsive Design:** The application is designed to be usable across different screen sizes.

### Technologies Used

  * **HTML5:** For the structure of the web application.
  * **CSS3:** For styling and layout.
  * **JavaScript (ES6+):** For application logic and interactivity.
  * **Firebase:**
      * **Firebase Authentication:** For user signup and login.
      * **Firebase Firestore:** For NoSQL database to store task data.

### Project Structure

  * `index.html`: The main HTML file that sets up the page structure, links to CSS and JavaScript, and imports Firebase SDKs.
  * `script.js`: Contains all the JavaScript logic for Firebase initialization, user authentication, CRUD operations for tasks, and UI interactions.
  * `style.css`: Contains all the CSS rules for styling the application, including responsive design elements.
  * `logo.png`: The logo used in the header of the website.

### Setup and Installation

To run this project locally, you will need to:

1.  **Clone the Repository:**

    ```bash
    git clone <repository-url>
    cd task-manager-website
    ```

2.  **Set up Firebase Project:**

      * Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
      * Add a web app to your Firebase project.
      * Copy your Firebase configuration.

3.  **Update `script.js` with your Firebase Config:**

      * Open `script.js`.
      * Locate the `initializeFirebase` function.
      * Replace the placeholder `firebaseConfig` object with your actual Firebase configuration from the Firebase Console.
        ```javascript
        const firebaseConfig = {
            apiKey: "YOUR_API_KEY",
            authDomain: "YOUR_AUTH_DOMAIN",
            projectId: "YOUR_PROJECT_ID",
            storageBucket: "YOUR_STORAGE_BUCKET",
            messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
            appId: "YOUR_APP_ID",
            measurementId: "YOUR_MEASUREMENT_ID"
        };
        ```
      * Enable **Email/Password** authentication in your Firebase project's Authentication section.
      * Enable **Firestore Database** in your Firebase project and start it in production mode (or test mode for quick setup).

4.  **Open `index.html`:**

      * Simply open the `index.html` file in your web browser. You don't need a local server for this basic setup, as Firebase SDKs are loaded from a CDN.

### Usage

1.  **Authentication:** Upon opening the application, you will be presented with a login/signup form. Create a new account or log in with an existing one.
2.  **Task List:** After successful authentication, you will see your task list.
3.  **Add Task:** Click the "Add New Task" button to open the task form. Fill in the details and click "Save Task".
4.  **Edit Task:** Click the "Edit" button next to a task to modify its details.
5.  **Toggle Completion:** Click the "Complete" or "Unmark" button to change a task's completion status.
6.  **Delete Task:** Click the "Delete" button next to a task. A confirmation modal will appear before deletion.
7.  **Filter/Sort:** Use the filter buttons ("All", "Active", "Completed") and the sort dropdown to organize your tasks.
8.  **Logout:** Click the "Logout" button in the header to sign out.
