# My Personal Portfolio & Blog

Welcome to your new portfolio, built with a modern, powerful tech stack designed for flexibility and ease of use. This application serves as a central hub to showcase your work, share your thoughts, display your travels, and connect with others.

This README provides a comprehensive guide to understanding, customizing, and managing your portfolio.

## ✨ Key Features

-   **Core Home Page:** A permanent landing page that always remains active as the main entry point to your site.
-   **Dynamic Blog:** A full-featured blog powered by a Supabase database, with Markdown support and bulk management capabilities.
-   **Photo Gallery:** A dynamic gallery with automatic EXIF data extraction, managed via Supabase Storage, enhanced with AI-generated tags and bulk actions.
-   **Interactive Travel Map:** Pin your travel destinations on a world map, with bulk import/export and management features.
-   **Contact Form:** A secure, serverless contact form that sends emails directly to you.
-   **AI Chatbot:** An integrated chatbot powered by Google Gemini that uses an editable knowledge base to provide intelligent answers about your portfolio.
-   **Comprehensive Data Management:** Export your entire portfolio to a single JSON file for backup, or import a backup to restore your site.
-   **User Profile Management:** Securely update your administrator profile information, avatar, and change your password.
-   **Feature Toggles:** A settings page to enable or disable entire sections of the portfolio.
-   **Enhanced Navigation:** All content pages are paginated and can be navigated using keyboard arrows or swipe gestures on mobile.
-   **Light & Dark Mode:** A sleek theme toggle for user preference.
-   **Fully Responsive:** Designed to look great on all devices, from desktops to mobile phones.

---

## 🛠️ Setting Up Your Environment

To use features like the map, AI chatbot, and contact form, you need to provide a few API keys.

### Client-Side Environment Variables

These keys are used in the browser. You should create a `.env` file in the root of your project and add the following variables:

-   `VITE_MAPBOX_ACCESS_TOKEN`: Your access token from [Mapbox](https://www.mapbox.com/), required for the Travel Map.
-   `VITE_GEMINI_API_KEY`: Your API key from [Google AI Studio](https://aistudio.google.com/), required for the AI Chatbot and AI-powered image tagging.
-   `VITE_GEMINI_MODEL_NAME`: The name of the Gemini model to use (e.g., `"gemini-pro"` or `"gemini-1.5-flash"`).
-   `VITE_ALLOWED_EMAIL`: The single email address that is permitted to sign in to the admin dashboard.

*Note: Your Supabase URL and Publishable Key are already pre-configured in the code.*

### Server-Side Secrets (Supabase)

These keys are stored securely in your Supabase project dashboard and are used by the serverless Edge Functions.

1.  Navigate to your Supabase Project Dashboard.
2.  Go to **Settings** -> **Edge Functions**.
3.  Under **Manage Secrets**, add the following:
    -   `RESEND_API_KEY`: Your API key from [Resend](https://resend.com/), required for the Contact Form to send emails.
    -   `GEMINI_MODEL_NAME`: The name of the Gemini model to use for server-side functions (e.g., `"gemini-pro"` or `"gemini-1.5-flash"`).

---

## 🗂️ Managing Your Portfolio Content

All content can be managed directly through the "Management" and "Settings" sections of the application's sidebar after you log in.

### 📝 Managing Blog Posts

1.  **Navigate:** Go to the **Manage Blog** page from the sidebar.
2.  **Create/Edit:** Use the form to create a new post or click the "Edit" icon on an existing post. The content field supports **Markdown**.
3.  **Bulk Actions:** Select multiple posts to delete, publish/unpublish, edit tags, or download them as Markdown files in a single ZIP archive.
4.  **Import:** You can bulk import posts from WordPress XML files or individual Markdown files.

### 🖼️ Managing the Photo Gallery

The gallery management page uses a two-tab system—**Published** and **Unpublished**—to give you precise control over your public gallery.

1.  **Navigate:** Go to the **Manage Gallery** page from the sidebar.
2.  **Upload Workflow:**
    *   Use the upload form to add one or more images. You can also include a `metadata.json` file in your selection to bulk-apply alt text and tags.
    *   Uploaded images automatically appear in the **"Unpublished"** tab as a list. This list view is designed for efficiency, allowing you to quickly manage many new uploads without loading all the thumbnails.
    *   In the "Unpublished" tab, you can preview each image in a lightbox and publish it with a single click.
3.  **Managing Published Images:**
    *   The **"Published"** tab displays a grid of all your live gallery images.
    *   **Individual Actions:** Each image has a switch to quickly publish/unpublish it and an "Edit" button to update its alt text and tags.
    *   **Bulk Actions:** Select multiple images to perform actions on them at once: Unpublish, Generate AI Tags, Download, or Delete.
4.  **Interactive Lightbox:**
    *   Clicking on any image (in either tab) opens it in a beautiful, full-screen lightbox.
    *   Controls for navigation, closing, and viewing EXIF data appear when you tap or click the image and fade out automatically.

### 🗺️ Managing the Travel Map

1.  **Navigate:** Go to the **Manage Travel** page.
2.  **Create/Edit:** Use the form to add a new location. If you leave coordinates blank, they will be auto-detected from the place name.
3.  **Bulk Actions:** Select multiple locations to delete, publish/unpublish, or download as a CSV file.
4.  **Import:** You can bulk import locations from a CSV file. A sample file is available for download on the page.

### 🤖 Managing the AI Chatbot

1.  **Navigate:** Go to the **Chatbot Knowledge** page from the sidebar under "Settings".
2.  **Edit Knowledge:** The large text area contains the entire "knowledge base" the AI uses to answer questions. You can edit this text directly.
3.  **Auto-Generate:** Click the **"Generate from Portfolio"** button to automatically create a new knowledge base from your latest published content.
4.  **Save:** Click "Save Knowledge Base" to apply your changes.

### ⚙️ Managing Your Data

1.  **Navigate:** Go to the **Manage Data** page under "Settings".
2.  **Export:** Download a complete backup of your posts, gallery metadata, travel locations, and chatbot knowledge in a single JSON file.
3.  **Import:** **(Destructive)** Upload a backup JSON file to restore your portfolio. This will delete all existing data first.
4.  **Reset:** **(Destructive)** Permanently delete all content from your portfolio.

### 👤 Managing Your Profile

1.  **Navigate:** Go to the **User Profile** page under "Settings".
2.  **Update Info:** Change your first name, last name, and avatar.
3.  **Change Password:** Securely update your administrator password.

### 📧 Configuring the Contact Form

1.  **API Key:** Ensure your `RESEND_API_KEY` is set as a secret in your Supabase project (see "Setting Up Your Environment").
2.  **Email Configuration:**
    *   Open the file: `supabase/functions/send-contact-email/index.ts`.
    *   Update the `TO_EMAIL` constant to your personal email address.
    *   Update the `FROM_EMAIL` constant. **Important:** The domain of this email address must be verified in your Resend account.

---

## 🚀 Tech Stack & Backend Overview

This portfolio is built with a selection of modern tools chosen for their performance, developer experience, and scalability.

| Category          | Technology                                                              |
| :---------------- | :---------------------------------------------------------------------- |
| **Frontend**      | [React](https://react.dev/) & [Vite](https://vitejs.dev/)               |
| **Language**      | [TypeScript](https://www.typescriptlang.org/)                           |
| **Styling**       | [Tailwind CSS](https://tailwindcss.com/)                                |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/)                                     |
| **Backend**       | [Supabase](https://supabase.com/)                                       |
| **AI**            | [Google Gemini](https://ai.google.dev/)                                 |
| **Routing**       | [React Router](https://reactrouter.com/)                                |
| **Forms**         | [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/) |
| **Icons**         | [Lucide React](https://lucide.dev/)                                     |

### Supabase Backend

Supabase provides the entire backend for this application, including:

-   **PostgreSQL Database:** A robust database stores all your content. The key tables are:
    -   `posts`: Stores blog articles.
    -   `gallery_images`: Stores metadata for uploaded photos.
    -   `travel_locations`: Stores data for map pins.
    -   `profiles`: Stores administrator user profile information.
    -   `feature_toggles`: Controls which site features are active.
    -   `chatbot_knowledge`: Stores the context for the AI assistant.
-   **Storage:** Manages all user-uploaded files for the gallery and map markers.
-   **Edge Functions:** Serverless functions handle backend logic for the contact form, data management, and AI image tagging.