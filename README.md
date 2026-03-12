# My Awesome React App

This is a modern React application built with TypeScript, React Router, Tailwind CSS, and `shadcn/ui` components. It leverages Supabase for backend services and Google Gemini for AI-powered features.

## Latest Functionality

This application provides a comprehensive suite of features for a personal portfolio, including robust content management, AI-driven analysis, and enhanced user experience.

### Core Features

*   **Refactored Architecture**: The codebase has been significantly optimized by centralizing data management logic into reusable custom React hooks (`useManagement`, `useBlogManagement`, `useTravelManagement`), making the application more robust and maintainable.
*   **AI-Powered Career Fit Analyst (V2)**: A standout feature that analyzes job descriptions against the portfolio's content and a detailed JSON Resume. It supports **Vision-first analysis** (screenshot uploads), robust URL scraping via **Jina Reader**, and standard text pasting, providing a match percentage and a reasoned breakdown of strengths and gaps with mitigations.
*   **Dynamic CV/Portfolio Page**: Displays a professional curriculum vitae from a JSON Resume source, complete with collapsible sections for readability and a print-to-PDF function.
*   **AI Chatbot**: An integrated chatbot that answers questions about the portfolio using a knowledge base that can be manually edited or automatically generated from all site content, including the CV.
*   **Text Readability Controls**: Users can adjust the base font size and line height across the site for a comfortable reading experience.
*   **Enhanced Navigation**: All paginated content (Blog, Gallery, Travel) supports keyboard arrow keys and mobile swipe gestures for navigation.

### Content Management

*   **Unified Management UI**: Blog, Gallery, and Travel management pages feature tabbed interfaces to separate "Published" and "Unpublished" content, improving organization.
*   **Blog Management**:
    *   Create, edit, and manage posts with a rich Markdown editor.
    *   Import posts from WordPress XML or Markdown files.
    *   Perform bulk actions like deleting, downloading, and updating tags.
    *   Global search functionality to easily find posts.
*   **Gallery Management**:
    *   Upload images and automatically extract EXIF data.
    *   AI-powered tag generation for uploaded images.
    *   Bulk actions for publishing, deleting, downloading, and tag generation.
    *   Bulk update metadata (alt text, tags, purchase links) by uploading a single JSON file.
    *   An image lightbox with EXIF data display and a "Purchase" button.
*   **Travel Map Management**:
    *   Pin travel locations on an interactive map.
    *   Bulk import locations from a CSV file.
    *   Link travel pins to relevant blog posts.

## Technologies Used

*   **React**: A JavaScript library for building user interfaces.
*   **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript.
*   **React Router**: For declarative routing in React applications.
*   **Tailwind CSS**: A utility-first CSS framework for rapidly building custom designs.
*   **shadcn/ui**: A collection of reusable components built with Radix UI and Tailwind CSS.
*   **Custom React Hooks**: For centralized and reusable state management logic (`useManagement`, `useBlogManagement`, etc.).
*   **Supabase**: An open-source Firebase alternative providing a PostgreSQL database, authentication, storage, and serverless edge functions.
*   **Google Gemini**: Powers the AI features, including the Career Fit Analyst, chatbot, and image tag generation.
*   **lucide-react**: A collection of beautiful and consistent icons.

## Architecture & Workflows

For an in-depth look at the system architecture (including Mermaid sequence and component diagrams), please view the **[`ARCHITECTURE.md`](documentation/ARCHITECTURE.md)** file.

Additional project documentation outlining coding standards, development workflows, and specific guidelines can be found in the [`documentation/`](documentation/) folder.

### Best Practices & Guidelines

- **[React Best Practices](documentation/best-practices/react-best-practices.md)**: Comprehensive performance optimization guide for React and Next.js applications. Contains 40+ rules across 8 categories, prioritized by impact from critical (eliminating waterfalls, reducing bundle size) to incremental (advanced patterns). This guide is automatically enforced during the implementation phase of feature development.

- **[Speckit Development Workflows](.agents/workflows/)**: Automated feature development lifecycle commands (e.g., `/speckit.feature`, `/speckit.clarify`). This ensures all architectural decisions are continuously tracked and checked into version control alongside code changes.

- **[Vercel Deployment Guide](documentation/best-practices/vercel-deploy.md)**: Step-by-step guide for deploying to Vercel using the official Vercel CLI. Includes prerequisites, authentication, deployment steps, and troubleshooting. This guide is automatically checked before merging features to ensure deployment readiness.

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
3.  **Set up Environment Variables**:
    *   Create a `.env` file in the root of the project.
    *   Add your Supabase project URL and Anon Key.
    *   Add your Google Gemini API key.
    *   Add the URL to your public JSON Resume file (e.g., a GitHub Gist).
    *   Add your Mapbox Access Token.
4.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173` (or another port if 5173 is in use).