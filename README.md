# Author Portfolio for Sripriya Srinivasan

Welcome to your new author portfolio, built with a modern, powerful tech stack designed for elegance and ease of use. This application serves as a central hub to showcase your books, share your story, and connect with your readers.

This README provides a guide to understanding and customizing your portfolio.

## ✨ Key Features

-   **Hero Section:** A welcoming introduction with your photo, name, and a brief bio.
-   **Book Showcase:** A dedicated section to display your published works with links to purchase them.
-   **About Me:** A space to share more about your journey as an author.
-   **Social Links:** Easy-to-find links for your readers to connect with you on social media.
-   **Contact Form:** A secure, serverless contact form that sends emails directly to you.
-   **Light & Dark Mode:** A sleek theme toggle for user preference.
-   **Fully Responsive:** Designed to look great on all devices, from desktops to mobile phones.

## 🛠️ Customizing Your Portfolio

All content for your website is located in a single file, making it easy to update.

**File Location:** `src/pages/Index.tsx`

### 1. Updating Your Profile Information

Open `src/pages/Index.tsx` and find the "Hero Section". You can change your name, title, and the introductory paragraph here. To change your profile picture, you can replace the placeholder URL in the `<AvatarImage>` component with a link to your own photo.

### 2. Managing Your Books

In the same file (`src/pages/Index.tsx`), find the `books` array near the top. You can add, remove, or edit books in this list.

-   `title`: The title of your book.
-   `coverUrl`: A URL to the book cover image.
-   `amazonUrl`: The direct link to your book's purchase page.

### 3. Updating Social Links

Find the `socialLinks` array. You can add or remove social media profiles by editing this list. The icons are from the [Lucide Icons](https://lucide.dev/) library.

### 4. Configuring the Contact Form

The contact form uses a Supabase Edge Function to send emails via the Resend service.

1.  **API Key Requirement:** For the form to work, you must set your `RESEND_API_KEY` as a secret in your Supabase project settings.
2.  **Email Configuration:**
    *   Open the file: `supabase/functions/send-contact-email/index.ts`.
    *   Update the `TO_EMAIL` constant to your personal email address.
    *   Update the `FROM_EMAIL` constant. **Important:** The domain of this email address must be verified in your Resend account.

---

## 📂 Project Structure

```
/
├── public/           # You can place static assets like images here
├── src/
│   ├── components/   # Reusable React components (e.g., Layout)
│   ├── pages/        # Page components (Index.tsx is your main page)
│   ├── App.tsx       # Main application component with routing
│   └── main.tsx      # Application entry point
├── supabase/
│   └── functions/    # Serverless functions (for the contact form)
└── README.md         # This file