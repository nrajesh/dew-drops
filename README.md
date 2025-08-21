# My Personal Portfolio & Blog

Welcome to your new portfolio, built with a modern, powerful tech stack designed for flexibility and ease of use. This application serves as a central hub to showcase your work, share your thoughts, display your travels, and connect with others.

This README provides a comprehensive guide to understanding, customizing, and managing your portfolio.

## ✨ Key Features

-   **Core Home Page:** A permanent landing page that always remains active as the main entry point to your site.
-   **Dynamic Blog:** A full-featured blog powered by a Supabase database, with Markdown support for writing posts.
-   **Photo Gallery:** A dynamic gallery with automatic EXIF data extraction, managed via Supabase Storage.
-   **Interactive Travel Map:** Pin your travel destinations on a world map. The list is searchable by title, location, and description.
-   **Contact Form:** A secure, serverless contact form that sends emails directly to you.
-   **AI Chatbot:** An integrated chatbot powered by Google Gemini that uses your portfolio's content to provide intelligent answers.
-   **Streamlined Content Management:** Dedicated pages for creating, editing, and deleting your content.
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
|                   | &nbsp;&nbsp;&nbsp;**Database**                                          | A PostgreSQL database for storing blog posts, videos, and travel locations.                        |
|                   | &nbsp;&nbsp;&nbsp;**Storage**                                           | For hosting user-uploaded images for the gallery and map markers.                                  |
|                   | &nbsp;&nbsp;&nbsp;**Edge Functions**                                    | Serverless functions for backend logic, like the contact form and video search.                    |
| **AI**            | [Google Gemini](https://ai.google.dev/)                                 | Powers the conversational AI chatbot feature.                                                      |
| **Routing**       | [React Router](https://reactrouter.com/)                                | The standard for declarative routing in React applications.                                        |
| **Forms**         | [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/) | A powerful combination for building performant, type-safe, and validated forms.                    |
| **Icons**         | [Lucide React](https://lucide.dev/)                                     | A beautiful and consistent open-source icon set.                                                   |

---

## 🛠️ Customizing Your Portfolio

This section guides you through updating the different parts of your portfolio. Most content can be managed directly through the "Management" section of the application's sidebar.

### 📝 Managing Blog Posts

Your blog posts are stored in the Supabase database, allowing for persistent storage.

1.  **Navigate:** Go to the **Manage Blog** page from the sidebar.
2.  **Create/Edit:** Use the form to create a new post or click the "Edit" icon on an existing post.
3.  **Content:** The "Content" field supports **Markdown**. This allows you to format text, add links, images, and code blocks.
4.  **Save:** Click "Add Post" or "Update Post" to save your changes to the database.

**File Location:** `src/pages/ManageBlog.tsx`

### 🖼️ Managing the Photo Gallery

The gallery is fully dynamic, with images stored in Supabase Storage and metadata in the database.

1.  **Navigate:** Go to the **Manage Gallery** page.
2.  **Upload:** Use the upload form to add new images. The system will automatically attempt to extract EXIF data (camera model, date taken, etc.) from your photos.
3.  **Manage:** You can edit the "alt text" for each image (important for accessibility) or delete images.

**Note on Caching:** To ensure fast loading times, gallery images are aggressively cached on the CDN and in the user's browser for one year. If you replace an image with a new version that has the same file name, you may need to clear your browser cache to see the change.

### 🗺️ Managing the Travel Map

Your travel locations are stored in the Supabase database, making them persistent and easy to manage.

1.  **Navigate:** Go to the **Manage Travel** page from the sidebar.
2.  **Create/Edit:** Use the form to add a new location. You can provide a title, place name, and optionally, a blog post URL and a custom image for the map pin. If you leave coordinates blank, they will be auto-detected from the place name. To edit, click the pencil icon on an existing location in the list.
3.  **Delete:** Click the trash can icon to permanently remove a location.

**Configuration Requirements:**
*   **Mapbox API Key:** The map on the "Travel" page is powered by Mapbox. You must have a valid `VITE_MAPBOX_ACCESS_TOKEN` set in your environment variables for it to display correctly.
*   **Supabase Storage:** To use custom marker icons, you must create a public Storage bucket named `mapmarkers` in your Supabase project.

### ⚙️ Managing Feature Toggles

You can enable or disable entire modules of your portfolio to customize what visitors see.

1.  **Navigate:** Go to the **Feature Toggles** page from the sidebar in the "Management" section.
2.  **Toggle:** Use the switches to turn features like the Blog, Gallery, or Travel map on or off. Changes are saved automatically.
3.  **Effect:** Disabling a feature will remove it from the main navigation for all visitors.

**File Location:** `src/pages/FeatureToggles.tsx`

### 🤖 Tuning the AI Chatbot

The chatbot uses a **Retrieval-Augmented Generation (RAG)** approach. It's not intelligent on its own; instead, it's given a "cheat sheet" of your portfolio's content with every question you ask. You can customize its knowledge and personality by editing two key files:

1.  **To change *what* the chatbot knows:**
    *   **File:** `src/hooks/usePortfolioContext.ts`
    *   **How:** This file fetches the data that forms the chatbot's context. You can change the `.limit()` on the Supabase queries to give it more (or less) information about your posts, travels, etc. You could also add new queries to other tables to expand its knowledge base.

2.  **To change *how* the chatbot behaves:**
    *   **File:** `src/pages/Chat.tsx`
    *   **How:** Find the `formatContext` function. The text inside this function is the "system prompt" that gives the AI its instructions and personality. You can edit this prompt to make it more formal, more creative, or to change how it formats its answers.

### 📧 Configuring the Contact Form

The contact form uses a Supabase Edge Function to send emails via the Resend service.

1.  **Supabase Edge Function:** The logic is located at `supabase/functions/send-contact-email/index.ts`.
2.  **API Key Requirement:** For the form to work, you must set your `RESEND_API_KEY` as a secret in your Supabase project settings.
3.  **Email Configuration:**
    *   Open the file: `supabase/functions/send-contact-email/index.ts`.
    *   Update the `TO_EMAIL` constant to your personal email address.
    *   Update the `FROM_EMAIL` constant. **Important:** The domain of this email address must be verified in your Resend account.

---

## 📂 Project Structure

A brief overview of the most important files and directories.

```
/
├── public/
│   └── gallery/      # (Legacy) No longer used for dynamic gallery
├── src/
│   ├── components/   # Reusable React components (e.g., Layout, Map)
│   ├── hooks/        # Custom React hooks (e.g., usePortfolioContext)
│   ├── integrations/ # Supabase & Gemini client setup
│   ├── pages/        # Page components for each route (e.g., Blog, Travel, ManageTravel)
│   ├── types/        # TypeScript type definitions
│   ├── App.tsx       # Main application component with routing
│   └── main.tsx      # Application entry point
├── supabase/
│   └── functions/    # Supabase Edge Functions
└── README.md         # This file
```

Thank you for using this portfolio template. Happy coding!