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
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<Layout />}>
      <Route path="/" element={<Index />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:id" element={<Post />} />
      <Route path="/videos" element={<Videos />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/travel" element={<Travel />} />
      <Route path="/contact" element={<Contact />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/manage-blog" element={<ManageBlog />} />
        <Route path="/manage-videos" element={<ManageVideos />} />
        <Route path="/manage-travel" element={<ManageTravel />} />
      </Route>
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;