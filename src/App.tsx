import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Blog from "./pages/Blog";
import Post from "./pages/Post";
import Videos from "./pages/Videos";
import Gallery from "./pages/Gallery";
import Travel from "./pages/Travel";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import ManageBlog from "./pages/ManageBlog";
import ManageVideos from "./pages/ManageVideos";
import ManageTravel from "./pages/ManageTravel";
import ManageGallery from "./pages/ManageGallery";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { mainNavItems, managementNavItems } from "./config/navigation";

const App = () => (
  <Routes>
    <Route element={<Layout />}>
      {/* Public Routes */}
      {mainNavItems
        .filter((item) => item.visible)
        .map((item) => {
          const Component = item.to === "/" ? Index :
                            item.to === "/blog" ? Blog :
                            item.to === "/videos" ? Videos :
                            item.to === "/gallery" ? Gallery :
                            item.to === "/travel" ? Travel : null;
          if (!Component) return null;
          return <Route key={item.to} path={item.to} element={<Component />} />;
        })}
      
      <Route path="/blog/:id" element={<Post />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/login" element={<Login />} />

      {/* Protected Management Routes */}
      <Route element={<ProtectedRoute />}>
        {managementNavItems
          .filter((item) => item.visible)
          .map((item) => {
            const Component = item.to === "/manage-blog" ? ManageBlog :
                              item.to === "/manage-videos" ? ManageVideos :
                              item.to === "/manage-travel" ? ManageTravel :
                              item.to === "/manage-gallery" ? ManageGallery : null;
            if (!Component) return null;
            return <Route key={item.to} path={item.to} element={<Component />} />;
          })}
      </Route>
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;