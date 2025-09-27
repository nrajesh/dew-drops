import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Blog from "./pages/Blog";
import Post from "./pages/Post";
import Gallery from "./pages/Gallery";
import Travel from "./pages/Travel";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { mainNavItems, managementNavItems, settingsNavItems } from "./config/navigation";
import { useFeatureToggles } from "./contexts/FeatureToggleContext";
import { Skeleton } from "./components/ui/skeleton";

const ManageBlog = lazy(() => import("./pages/ManageBlog"));
const ManageGallery = lazy(() => import("./pages/ManageGallery"));
const ManageTravel = lazy(() => import("./pages/ManageTravel"));
const FeatureToggles = lazy(() => import("./pages/FeatureToggles"));
const Profile = lazy(() => import("./pages/Profile"));
const ManageData = lazy(() => import("./pages/ManageData"));
const ManageChatbot = lazy(() => import("./pages/ManageChatbot"));
const CurriculumVitae = lazy(() => import("./pages/CurriculumVitae")); // Lazy load CV page

const FullPageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="space-y-4 text-center">
      <Skeleton className="h-12 w-64 mx-auto" />
      <Skeleton className="h-8 w-48 mx-auto" />
    </div>
  </div>
);

const App = () => {
  const { toggles, loading } = useFeatureToggles();

  if (loading) {
    return <FullPageLoader />;
  }

  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          {mainNavItems
            .filter((item) => toggles[item.featureKey] || !item.featureKey)
            .map((item) => {
              const Component = item.to === "/" ? Index :
                                item.to === "/blog" ? Blog :
                                item.to === "/gallery" ? Gallery :
                                item.to === "/portfolio" ? CurriculumVitae : // New route for Portfolio
                                item.to === "/travel" ? Travel :
                                item.to === "/contact" ? Contact : null;
              if (!Component) return null;
              return <Route key={item.to} path={item.to} element={<Component />} />;
            })}

          <Route path="/blog/:id" element={<Post />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            {managementNavItems
              .filter((item) => toggles[item.featureKey])
              .map((item) => {
                const Component = item.to === "/manage-blog" ? ManageBlog :
                                  item.to === "/manage-gallery" ? ManageGallery :
                                  item.to === "/manage-travel" ? ManageTravel :
                                  item.to === "/feature-toggles" ? FeatureToggles : null;
                if (!Component) return null;
                return <Route key={item.to} path={item.to} element={<Component />} />;
              })}
            <Route path="/profile" element={<Profile />} />
            <Route path="/manage-data" element={<ManageData />} />
            <Route path="/manage-chatbot" element={<ManageChatbot />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default App;