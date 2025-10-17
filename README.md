# My Awesome React App

This is a modern React application built with TypeScript, React Router, Tailwind CSS, and `shadcn/ui` components. It leverages Supabase for backend services, including authentication, database management, and edge functions.

## Latest Functionality

This application provides robust content management features, particularly for a blog and a gallery.

### Gallery Management

*   **Image Upload**: Easily upload new images to your gallery.
*   **Image Metadata Editing**: Update alt text and tags for individual images.
*   **Publish/Unpublish Toggle**: Control the visibility of each image on your public gallery with a simple switch.
*   **Bulk Actions**: Perform operations like deleting, publishing, unpublishing, generating tags, and downloading multiple selected images at once.
*   **Image Lightbox**: View images in a full-screen lightbox for a better experience.

### Blog Management

*   **Post Creation & Editing**: Create new blog posts or edit existing ones with a rich form interface, including title, description, content (Markdown), tags, cover image selection from the gallery, and YouTube video ID integration.
*   **Content Import**: Import blog posts from WordPress XML files or Markdown files, with intelligent handling for existing posts.
*   **Tabbed Interface**: Organize and view your blog posts in separate "Published" and "Unpublished" tabs.
*   **Publish/Unpublish Toggle**: Control the visibility of each blog post on your public blog with a simple switch.
*   **Bulk Actions**: Apply bulk operations such as editing tags, downloading, and deleting multiple selected posts.

## Technologies Used

*   **React**: A JavaScript library for building user interfaces.
*   **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript.
*   **React Router**: For declarative routing in React applications.
*   **Tailwind CSS**: A utility-first CSS framework for rapidly building custom designs.
*   **shadcn/ui**: A collection of reusable components built with Radix UI and Tailwind CSS.
*   **Supabase**: An open-source Firebase alternative providing a PostgreSQL database, authentication, instant APIs, and edge functions.
*   **lucide-react**: A collection of beautiful and consistent icons.

## Getting Started

To run this project locally:

1.  **Clone the repository**:
    ```bash
    git clone [your-repo-url]
    cd [your-repo-name]
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Set up Supabase**:
    *   Ensure your Supabase project is configured with the necessary tables and RLS policies as described in the application's development process.
    *   Update your `.env` file with your Supabase project URL and Anon Key.
4.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173` (or another port if 5173 is in use).