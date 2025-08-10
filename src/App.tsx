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
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Chat from "./pages/Chat";
import { mainNavItems, managementNavItems } from "./config/navigation";

const componentMap: { [key: string]: React.ComponentType } = {
  "/": Index,
  "/blog": Blog,
  "/videos": Videos,
  "/gallery": Gallery,
  "/travel": Travel,
  "/chat": Chat,
  "/manage-blog": ManageBlog,
  "/manage-videos": ManageVideos,
  "/manage-travel": ManageTravel,
};

const allNavItems = [...mainNavItems, ...managementNavItems];

const App = () => (
  <Routes>
    <Route element={<Layout />}>
      {allNavItems
        .filter((item) => item.visible)
        .map((item) => {
          const Component = componentMap[item.to];
          if (!Component) return null;
          return <Route key={item.to} path={item.to} element={<Component />} />;
        })}
      
      {/* Utility routes that are not part of the main navigation */}
      <Route path="/blog/:id" element={<Post />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;