# Architecture

## System Overview
Dew Drops is a modern, mobile-first React application built to showcase a personal portfolio, CV match maker, blog, photography, and travelogue. It uses Vite for build tooling and HMR, React Router for client-side navigation, Tailwind CSS and Shadcn/ui for styling and components, and Supabase for backend database and authentication. A key strict requirement is a single-admin architecture where all write operations (creating blogs, uploading photos, adding travel pins, editing the CV) are securely restricted strictly to a single admin user.

## Architectural Decisions
- **Mobile First Approach**
    - **Context**: The application constitutes a personal portfolio designed to be primarily consumed on mobile devices.
    - **Decision**: All UI components are explicitly designed using mobile-first Tailwind CSS classes, adding minimum breakpoints only for larger displays if necessary.
    - **Consequences**: Ensures an optimal and uniform user experience across smartphones while reducing mobile layout reflow issues.

- **Single Admin Restriction**
    - **Context**: Content creation should exclusively be handled by the portfolio owner to prevent unauthorized edits.
    - **Decision**: Row Level Security (RLS) on Supabase and rigorous client-side route guards strictly allow only one distinct authenticated admin to perform PUT/POST/DELETE operations.
    - **Consequences**: Vastly simplifies role management and improves overall security against content tampering, though prevents any future multi-user content creation without architectural refactoring.

- **Vite & React Ecosystem**
    - **Context**: Needed high performance, modularity, and rapid development capabilities.
    - **Decision**: Migrated to Vite for the build process, utilizing React 18 functional components and custom hooks for business logic separation (`useManagement`, `useBlogManagement`, etc.).
    - **Consequences**: Significantly improved developer experience (DX) and build times.

- **Two-Layer Caching Strategy**
    - **Context**: Gallery and other public data pages were making fresh Supabase network requests on every mount, causing slow perceived load times on repeat visits.
    - **Decision**: A two-layer cache is used:
        1. **SWR (in-memory)** — custom hooks (`useGalleryImages`, `useGalleryManagement`) use SWR with `keepPreviousData: true` and `dedupingInterval: 60 s`. Navigating back to a page is instant; a background revalidation runs silently.
        2. **Workbox runtime cache (service worker)** — `vite-plugin-pwa` is configured with two runtime strategies:
           - `NetworkFirst` on Supabase REST API responses (5 min TTL) — always tries the network first, serves cache when offline.
           - `CacheFirst` on Supabase Storage CDN image files (1 day TTL, 200 entries) — gallery images are immutable in practice (file_name encodes upload timestamp), so serving from cache is safe and eliminates the CDN round-trip entirely on revisit.
    - **Consequences**: Gallery cold-start is unchanged (first load still hits Supabase), but repeat visits and page navigation are dramatically faster. Image files are ~60–80% smaller thanks to Supabase Storage transform parameters (`?width=600&quality=75`) applied to thumbnails.

## Diagrams

### Web Application Architecture

```mermaid
graph TB
    subgraph Browser["🌐 Browser"]
        direction TB
        UI["React UI<br/>(Shadcn + Tailwind)"]
        Router["React Router<br/>(SPA Navigation)"]
        Hooks["Custom Hooks<br/>(useManagement, etc.)"]
        SWRCache["SWR Cache<br/>(in-memory, 60 s TTL)"]
        SBC["Supabase Client<br/>(Auth & API)"]
        PWA["Service Worker<br/>(Workbox Runtime Cache)"]
    end

    subgraph Backend["☁️ Supabase"]
        direction TB
        Auth["Authentication<br/>(Single Admin Policy)"]
        DB[("PostgreSQL<br/>(RLS Protected)")]
        Storage["Storage<br/>(Images/Assets)"]
        Edge["Edge Functions<br/>(AI Gemini Integration)"]
    end

    UI --> Router
    Router --> Hooks
    Hooks --> SWRCache
    SWRCache -->|cache miss| SBC
    UI -.- PWA
    PWA -->|CacheFirst CDN| Storage
    PWA -->|NetworkFirst API| SBC
    
    SBC --> Auth
    SBC --> DB
    SBC --> Storage
    SBC --> Edge

    style Browser fill:#1a1a2e,stroke:#16213e,color:#e8e8e8
    style UI fill:#61DAFB,stroke:#20232A,color:#000
    style Router fill:#f44250,stroke:#20232A,color:#fff
    style Hooks fill:#764abc,stroke:#20232A,color:#fff
    style SWRCache fill:#ff9900,stroke:#cc7a00,color:#000
    style SBC fill:#3ECF8E,stroke:#20232A,color:#000
    style PWA fill:#ffcc00,stroke:#20232A,color:#000
    
    style Backend fill:#1e1e1e,stroke:#333,color:#fff
    style Auth fill:#3ECF8E,stroke:#2b8a5c,color:#000
    style DB fill:#336791,stroke:#244b6b,color:#fff
    style Storage fill:#f39c12,stroke:#c87f0a,color:#fff
    style Edge fill:#9b59b6,stroke:#7d4596,color:#fff
```

### Data Flow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant UI as React UI
    participant SWR as SWR Cache
    participant SW as Service Worker
    participant Hook as Custom Hooks
    participant SBC as Supabase Client
    participant API as Supabase Backend
    participant AI as Gemini API

    U->>UI: Navigate to Gallery
    UI->>Hook: useGalleryImages()
    Hook->>SWR: check cache (key: gallery_images:published)
    alt Cache hit (within 60 s)
        SWR-->>Hook: return cached data instantly
        Hook-->>UI: images (no network call)
    else Cache miss
        SWR->>SW: check service worker cache
        alt SW cache hit (within 5 min)
            SW-->>SWR: cached API response
        else SW miss
            SWR->>SBC: supabase.from('gallery_images').select(*)
            SBC->>API: Authenticated GET Request
            API-->>SBC: gallery_images rows
            SBC-->>SW: response (stored with NetworkFirst)
            SW-->>SWR: response
        end
        SWR-->>Hook: fresh data
        Hook-->>UI: images
    end

    U->>UI: Open gallery image
    UI->>SW: fetch full-size image URL
    alt SW image cache hit (within 1 day)
        SW-->>UI: image from CacheFirst
    else
        SW->>API: fetch from Supabase Storage CDN
        API-->>SW: image bytes (cached)
        SW-->>UI: image bytes
    end

    U->>UI: Submit content (e.g. Blog Post)
    UI->>Hook: trigger update
    Hook->>SBC: supabase.from('posts').insert(...)
    SBC->>API: Authenticated POST Request
    API-->>API: Enforce Single Admin RLS
    API-->>SBC: Acknowledge entry creation
    
    alt If AI function triggered (e.g. Generate Tags)
        Hook->>SBC: supabase.functions.invoke('generate-tags-from-url')
        SBC->>API: Execute Edge Function
        API->>AI: Send image to Gemini
        AI-->>API: Return generated tags
        API-->>SBC: Tags response
        SBC-->>Hook: Return tags data
    end
    
    Hook-->>UI: Update Local State
    UI-->>U: Render updated view (Published)
```
