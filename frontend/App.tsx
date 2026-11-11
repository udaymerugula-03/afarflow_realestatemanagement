import { Component, lazy, Suspense, useEffect, type ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Loading } from "./components/ui";

const Home = lazy(() => import("./pages/Home"));
const Properties = lazy(() => import("./pages/Properties"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const Contact = lazy(() => import("./pages/Contact"));
const Login = lazy(() => import("./pages/Login"));
const Workspace = lazy(() => import("./pages/Workspace"));
const NotFound = lazy(() => import("./pages/NotFound"));

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="session-gate">
      <h1>Something interrupted the flow.</h1>
      <p role="alert">This page could not be displayed. Please try again.</p>
      <button onClick={() => window.location.reload()}>Reload page</button>
      <a href="/">Return home</a>
    </main>;
    return this.props.children;
  }
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    const section = pathname.split("/")[1];
    const title = ({ properties: "Explore properties", contact: "Contact", login: "Sign in", workspace: "Workspace" } as Record<string, string>)[section];
    document.title = title ? `${title} | AqarFlow` : "AqarFlow — Find a place to belong";
    window.scrollTo(0, 0);
  }, [pathname]);
  return <ErrorBoundary><Suspense fallback={<Loading />}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/properties" element={<Properties />} />
      <Route path="/properties/:id" element={<PropertyDetail />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      <Route path="/workspace/*" element={<Workspace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense></ErrorBoundary>;
}
