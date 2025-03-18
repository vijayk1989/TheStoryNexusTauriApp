import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { ThemeProvider } from "./lib/theme-provider";
import { ToastContainer } from "react-toastify";
import { StoryProvider } from "@/features/stories/context/StoryContext";
import App from "./app";
// Styles
import "./index.css";
import "react-toastify/dist/ReactToastify.css";

// Pages
import Home from "./features/stories/pages/Home";
import StoryDashboard from "./features/stories/pages/StoryDashboard";
import Chapters from "./features/chapters/pages/Chapters";
import ChapterEditorPage from "./features/chapters/pages/ChapterEditorPage";
import PromptsPage from "./features/prompts/pages/PromptsPage";
import AISettingsPage from "./features/ai/pages/AISettingsPage";
import { MainLayout } from "./components/MainLayout";
import LorebookPage from "./features/lorebook/pages/LorebookPage";
import BrainstormPage from "./features/brainstorm/pages/BrainstormPage";
import GuidePage from "./features/guide/pages/GuidePage";
import NotesPage from "./features/notes/pages/NotesPage";
// biome-ignore lint/style/noNonNullAssertion: <explanation>

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="app-theme">
      <BrowserRouter>
        <StoryProvider>
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
        </StoryProvider>
        <ToastContainer />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
