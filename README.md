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

## 🚀 Tech Stack & Technical Decisions

This portfolio is built with a selection of modern tools chosen for their performance, developer experience, and scalability.

| Category          | Technology                                                              | Reason                                                                                             |
| :---------------- | :---------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| **Frontend**      | [React](https://react.dev/) & [Vite](https://vitejs.dev/)               | A fast, modern, and robust foundation for building user interfaces.                                |
| **Language**      | [TypeScript](https://www.typescriptlang.org/)                           | Adds static typing to JavaScript, improving code quality and reducing bugs.                        |
| **Styling**       | [Tailwind CSS](https://tailwindcss.com/)                                | A utility-first CSS framework for rapid, responsive UI development without leaving your HTML.      |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/)                                     | A collection of beautifully designed, accessible, and unstyled components that you can own and customize. |
| **Backend**       | [Supabase](https://supabase.com/)                                       | The open-source Firebase alternative. Used for:                                                    |
|                   | &nbsp;&nbsp;&nbsp;**Database**                                          | A PostgreSQL database for storing blog posts, gallery metadata, travel locations, and chatbot knowledge. |
|                   | &nbsp;&nbsp;&nbsp;**Storage**                                           | For hosting user-uploaded images for the gallery and map markers.                                  |
|                   | &nbsp;&nbsp;&nbsp;**Edge Functions**                                    | Serverless functions for backend logic, like the contact form, data management, and AI image tagging. |
| **AI**            | [Google Gemini](https://ai.google.dev/)                                 | Powers the conversational AI chatbot feature and image embedding generation.                      |
| **Routing**       | [React Router](https://reactrouter.com/)                                | The standard for declarative routing in React applications.                                        |
| **Forms**         | [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/) | A powerful combination for building performant, type-safe, and validated forms.                    |
| **Icons**         | [Lucide React](https://lucide.dev/)                                     | A beautiful and consistent open-source icon set.                                                   |

---

## 🛠️ Customizing Your Portfolio

This section guides you through updating the different parts of your portfolio. Most content can be managed directly through the "Management" and "Settings" sections of the application's sidebar.

### 📝 Managing Blog Posts

1.  **Navigate:** Go to the **Manage Blog** page from the sidebar.
2.  **Create/Edit:** Use the form to create a new post or click the "Edit" icon on an existing post. The content field supports **Markdown**.
3.  **Bulk Actions:** Select multiple posts to delete, publish/unpublish, edit tags, or download them as Markdown files in a single ZIP archive.
4.  **Import:** You can bulk import posts from WordPress XML files or individual Markdown files.

### 🖼️ Managing the Photo Gallery

1.  **Navigate:** Go to the **Manage Gallery** page.
2.  **Upload:** Use the upload form to add new images. The system will automatically attempt to extract EXIF data (camera model, date taken, etc.).
3.  **AI Tagging:** Use the "Generate Tags" bulk action to have an AI analyze your selected images and create relevant search keywords.
4.  **Metadata Import/Export:** For bulk uploads, you can manage image metadata (alt text and tags) using a `metadata.json` file. Use the "Download Selected" action to get a ZIP file containing your images and a corresponding `metadata.json` file.

### 🗺️ Managing the Travel Map

1.  **Navigate:** Go to the **Manage Travel** page.
2.  **Create/Edit:** Use the form to add a new location. If you leave coordinates blank, they will be auto-detected from the place name.
3.  **Bulk Actions:** Select multiple locations to delete, publish/unpublish, or download as a CSV file.
4.  **Import:** You can bulk import locations from a CSV file. A sample file is available for download on the page.

### 🤖 Managing the AI Chatbot

You have full control over the chatbot's knowledge and behavior through a simple interface.

1.  **Navigate:** Go to the **Chatbot Knowledge** page from the sidebar under "Settings".
2.  **Edit Knowledge:** The large text area contains the entire "context" or "knowledge base" the AI uses to answer questions. You can edit this text directly to add, remove, or change information.
3.  **Auto-Generate:** Click the **"Generate from Portfolio"** button to automatically create a new knowledge base from your latest published blog posts, travel locations, and gallery image descriptions. This is a great way to quickly update the chatbot after adding new content.
4.  **Save:** Click "Save Knowledge Base" to apply your changes.

### ⚙️ Managing Your Data

For backups and migrations, you can manage all your portfolio's content data at once.

1.  **Navigate:** Go to the **Manage Data** page under "Settings".
2.  **Export:** Download a complete backup of your posts, gallery metadata, travel locations, and chatbot knowledge in a single JSON file.
3.  **Import:** **(Destructive)** Upload a backup JSON file to restore your portfolio. This will delete all existing data first.
4.  **Reset:** **(Destructive)** Permanently delete all content from your portfolio and reset it to a clean state.

### 👤 Managing Your Profile

1.  **Navigate:** Go to the **User Profile** page under "Settings".
2.  **Update Info:** Change your first name, last name, and avatar. The avatar can be set from a URL or by uploading a file.
3.  **Change Password:** Securely update your administrator password.

### 📧 Configuring the Contact Form

The contact form uses a Supabase Edge Function to send emails via the Resend service.

1.  **API Key Requirement:** For the form to work, you must set your `RESEND_API_KEY` as a secret in your Supabase project settings.
2.  **Email Configuration:**
    *   Open the file: `supabase/functions/send-contact-email/index.ts`.
    *   Update the `TO_EMAIL` constant to your personal email address.
    *   Update the `FROM_EMAIL` constant. **Important:** The domain of this email address must be verified in your Resend account.

---

## 📂 Project Structure

A brief overview of the most important files and directories.

```
/
├── public/           # Static assets
├── src/
│   ├── components/   # Reusable React components
│   ├── contexts/     # React Context providers (Auth, Features)
│   ├── hooks/        # Custom React hooks
│   ├── integrations/ # Supabase & Gemini client setup
│   ├── pages/        # Page components for each route
│   ├── types/        # TypeScript type definitions
│   ├── App.tsx       # Main application component with routing
│   └── main.tsx      # Application entry point
├── supabase/
│   └── functions/    # Supabase Edge Functions
└── README.md         # This file
```

Thank you for using this portfolio template. Happy coding!