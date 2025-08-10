# My Personal Portfolio & Blog

Welcome to your new portfolio, built with a modern, powerful tech stack designed for flexibility and ease of use. This application serves as a central hub to showcase your work, share your thoughts, display your travels, and connect with others.

This README provides a comprehensive guide to understanding, customizing, and managing your portfolio.

## ✨ Key Features

-   **Dynamic Blog:** A full-featured blog powered by a Supabase database, with Markdown support for writing posts.
-   **Video Showcase:** A dedicated page to embed and display your YouTube videos.
-   **Photo Gallery:** A simple, clean gallery to show off your photography.
-   **Interactive Travel Map:** Pin your travel destinations on a world map, complete with descriptions, links, and custom marker icons.
-   **Contact Form:** A secure, serverless contact form that sends emails directly to you.
-   **AI Chatbot:** An integrated chatbot powered by Google Gemini for interactive conversations.
-   **Streamlined Content Management:** Dedicated pages for creating, editing, and deleting your content.
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
|                   | &nbsp;&nbsp;&nbsp;**Database**                                          | A PostgreSQL database for storing blog posts and travel locations.                                 |
|                   | &nbsp;&nbsp;&nbsp;**Storage**                                           | For hosting user-uploaded images like custom map markers.                                          |
|                   | &nbsp;&nbsp;&nbsp;**Edge Functions**                                    | Serverless functions for backend logic, like the contact form.                                     |
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

### 🗺️ Managing the Travel Map

Your travel locations are stored in the Supabase database, making them persistent and easy to manage.

1.  **Navigate:** Go to the **Manage Travel** page from the sidebar.
2.  **Create/Edit:** Use the form to add a new location. You can provide a title, place name, and optionally, a blog post URL and a custom image for the map pin. If you leave coordinates blank, they will be auto-detected from the place name. To edit, click the pencil icon on an existing location in the list.
3.  **Delete:** Click the trash can icon to permanently remove a location.

**Configuration Requirements:**
*   **Mapbox API Key:** The map on the "Travel" page is powered by Mapbox. You must have a valid `VITE_MAPBOX_ACCESS_TOKEN` set in your environment variables for it to display correctly.
*   **Supabase Storage:** To use custom marker icons, you must create a public Storage bucket named `map_markers` in your Supabase project.

### 🎬 Managing Videos

Your videos are currently managed via a static list within the application code.

1.  **Navigate:** Go to the **Manage Videos** page.
2.  **How it Works:** This page uses local React state (`useState`). **Changes made here will not be saved** after you refresh the page. It's a demonstration of the UI.
3.  **To Permanently Add/Remove Videos:**
    *   Open the file: `src/pages/ManageVideos.tsx`.
    *   Find the `initialVideos` array.
    *   Modify this array to add, edit, or remove video objects. Each object needs a `title` and a `youtubeId`.

**Future Enhancement:** This could be migrated to use the Supabase database, similar to the blog, for persistent storage.

### 🖼️ Managing the Photo Gallery

The gallery pulls images directly from the `public/gallery` folder.

1.  **Add Images:** Place your `.jpg`, `.png`, or other image files inside the `public/gallery` directory in your project's codebase.
2.  **Update the List:**
    *   Open the file: `src/pages/Gallery.tsx`.
    *   Find the `images` array.
    *   Add a new object for each photo you added, specifying the `src` path (e.g., `/gallery/my-photo.jpg`) and an `alt` description.

```javascript
// Example in src/pages/Gallery.tsx
const images = [
  { src: "/gallery/alps-sunset.jpg", alt: "A beautiful sunset over the Swiss Alps" },
  { src: "/gallery/tokyo-streets.png", alt: "Neon-lit streets of Tokyo at night" },
  // ... add more images here
];
```

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
│   └── gallery/      # Add your gallery images here
├── src/
│   ├── components/   # Reusable React components (e.g., Layout, Map)
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