# Architecture

## System Overview
Dew Drops is a modern, mobile-first React application built to showcase a personal portfolio, CV match maker, blog, photography, and travelogue. It uses Vite for build tooling and HMR, React Router for client-side navigation, and Tailwind CSS and Shadcn/ui for styling and components. The application operates entirely with local data and integrates with external AI services for advanced features.

## Architectural Decisions
- **Mobile First Approach**
    - **Context**: The application constitutes a personal portfolio designed to be primarily consumed on mobile devices.
    - **Decision**: All UI components are explicitly designed using mobile-first Tailwind CSS classes, adding minimum breakpoints only for larger displays if necessary.
    - **Consequences**: Ensures an optimal and uniform user experience across smartphones while reducing mobile layout reflow issues.

- **Vite & React Ecosystem**
    - **Context**: Needed high performance, modularity, and rapid development capabilities.
    - **Decision**: Migrated to Vite for the build process, utilizing React 18 functional components and custom hooks for business logic separation (`useManagement`, `useBlogManagement`, etc.).
    - **Consequences**: Significantly improved developer experience (DX) and build times.

- **Two-Layer Caching Strategy**
    - **Context**: Gallery and other public data pages benefit from caching to ensure fast perceived load times on repeat visits.
    - **Decision**: A two-layer cache is used:
        1. **SWR (in-memory)** — custom hooks (`useGalleryImages`, `useGalleryManagement`) use SWR with `keepPreviousData: true` and `dedupingInterval: 60 s`. Navigating back to a page is instant; a background revalidation runs silently.
        2. **Workbox runtime cache (service worker)** — `vite-plugin-pwa` is configured with `CacheFirst` on local image files (1 day TTL, 200 entries).
    - **Consequences**: Repeat visits and page navigation are dramatically faster.

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
        PWA["Service Worker<br/>(Workbox Runtime Cache)"]
    end

    subgraph External["☁️ External Services"]
        direction TB
        AI["Google Gemini API<br/>(AI Analysis)"]
        Jina["Jina Reader API<br/>(URL Scraping)"]
        Gist["GitHub Gist<br/>(CV Data)"]
        Web3Forms["Web3Forms API<br/>(Email Delivery)"]
    end

    UI --> Router
    Router --> Hooks
    Hooks --> SWRCache
    Hooks --> AI
    Hooks --> Jina
    Hooks --> Gist
    Hooks --> Web3Forms
    UI -.- PWA

    style Browser fill:#1a1a2e,stroke:#16213e,color:#e8e8e8
    style UI fill:#61DAFB,stroke:#20232A,color:#000
    style Router fill:#f44250,stroke:#20232A,color:#fff
    style Hooks fill:#764abc,stroke:#20232A,color:#fff
    style SWRCache fill:#ff9900,stroke:#cc7a00,color:#000
    style PWA fill:#ffcc00,stroke:#20232A,color:#000
    
    style External fill:#1e1e1e,stroke:#333,color:#fff
    style AI fill:#4285F4,stroke:#20232A,color:#fff
    style Jina fill:#3ECF8E,stroke:#20232A,color:#000
    style Gist fill:#333,stroke:#ccc,color:#fff
    style Web3Forms fill:#6a5acd,stroke:#20232A,color:#fff
```

### Data Flow (Match-CV & Gallery)

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant UI as React UI
    participant SWR as SWR Cache
    participant SW as Service Worker
    participant Hook as Custom Hooks
    participant AI as Gemini API
    participant Jina as Jina Reader
    participant Gist as GitHub Gist

    U->>UI: Navigate to Gallery
    UI->>Hook: useGalleryImages()
    Hook->>SWR: check cache
    alt Cache hit
        SWR-->>Hook: return cached data
        Hook-->>UI: images
    else Cache miss
        Hook->>Hook: Load from local gallery_images.json
        Hook-->>UI: images
    end

    U->>UI: Run Career Fit Analysis
    alt Method: URL
        Hook->>Jina: Fetch job description content
        Jina-->>Hook: Markdown/Text
    else Method: Screenshot
        Hook->>Hook: Process image (downscale)
    end
    
    Hook->>Gist: Fetch Resume JSON
    Gist-->>Hook: Resume data
    Hook->>AI: Send data + prompt to Gemini
    AI-->>Hook: Return analysis results
    Hook-->>UI: Render result
```
