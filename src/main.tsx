import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ThemeProvider } from "./lib/theme-provider";
import { ToastContainer } from "react-toastify";
import { StoryProvider } from "@/features/stories/context/StoryContext";
import { useAIStore } from "@/features/ai/stores/useAIStore";
// Styles
import "./index.css";
import "react-toastify/dist/ReactToastify.css";

// Pages
import EditorWorkspace from "./features/editor/pages/EditorWorkspace";

// Initializes the AI service singleton on mount so local models are ready
// without requiring the user to visit AI Settings first.
function AppInitializer() {
    useEffect(() => {
        useAIStore.getState().initialize();
    }, []);
    return null;
}
// biome-ignore lint/style/noNonNullAssertion: <explanation>

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="app-theme">
      <BrowserRouter>
        <StoryProvider>
          <AppInitializer />
          <Routes>
            <Route path="/" element={<EditorWorkspace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </StoryProvider>
        <ToastContainer />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
