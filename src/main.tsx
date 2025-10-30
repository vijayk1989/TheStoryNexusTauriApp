import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { ThemeProvider } from "./lib/theme-provider";
import { ToastContainer } from "react-toastify";
import { StoryProvider } from "@/features/stories/context/StoryContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./app";
// Styles
import "./index.css";
import "react-toastify/dist/ReactToastify.css";

// Eagerly loaded pages (for fast initial navigation)
import Home from "./features/stories/pages/Home";
import { MainLayout } from "./components/MainLayout";

// Lazy loaded pages (code splitting for large features)
const StoryDashboard = lazy(() => import("./features/stories/pages/StoryDashboard"));
const Chapters = lazy(() => import("./features/chapters/pages/Chapters"));
const ChapterEditorPage = lazy(() => import("./features/chapters/pages/ChapterEditorPage"));
const PromptsPage = lazy(() => import("./features/prompts/pages/PromptsPage"));
const AISettingsPage = lazy(() => import("./features/ai/pages/AISettingsPage"));
const LorebookPage = lazy(() => import("./features/lorebook/pages/LorebookPage"));
const BrainstormPage = lazy(() => import("./features/brainstorm/pages/BrainstormPage"));
const GuidePage = lazy(() => import("./features/guide/pages/GuidePage"));
const NotesPage = lazy(() => import("./features/notes/pages/NotesPage"));

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);
// biome-ignore lint/style/noNonNullAssertion: <explanation>

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="app-theme">
        <BrowserRouter>
          <StoryProvider>
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                {/* Landing page */}
                <Route path="/" element={<App />} />

                {/* Routes with MainLayout */}
                <Route element={<MainLayout />}>
                  {/* Stories section */}
                  <Route path="/stories" element={<Home />} />
                  {/* AI Settings */}
                  <Route path="/ai-settings" element={<AISettingsPage />} />
                  {/* Guide */}
                  <Route path="/guide" element={<GuidePage />} />
                </Route>

                {/* Story Dashboard */}
                <Route path="/dashboard/:storyId" element={<StoryDashboard />}>
                  <Route path="chapters" element={<Chapters />} />
                  <Route
                    path="chapters/:chapterId"
                    element={<ChapterEditorPage />}
                  />
                  <Route path="prompts" element={<PromptsPage />} />
                  <Route path="lorebook" element={<LorebookPage />} />
                  <Route path="brainstorm" element={<BrainstormPage />} />
                  <Route path="notes" element={<NotesPage />} />
                </Route>
              </Routes>
            </Suspense>
          </StoryProvider>
          <ToastContainer />
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
