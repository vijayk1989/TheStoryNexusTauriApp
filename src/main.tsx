import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ThemeProvider } from "./lib/theme-provider";
import { ToastContainer } from "react-toastify";
import { StoryProvider } from "@/features/stories/context/StoryContext";
// Styles
import "./index.css";
import "react-toastify/dist/ReactToastify.css";

// Pages
import EditorWorkspace from "./features/editor/pages/EditorWorkspace";
// biome-ignore lint/style/noNonNullAssertion: <explanation>

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="app-theme">
      <BrowserRouter>
        <StoryProvider>
          <Routes>
            <Route path="/" element={<EditorWorkspace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </StoryProvider>
        <ToastContainer position="bottom-right" autoClose={1000} />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
