import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { ThemeProvider } from "./lib/theme-provider";
import { ToastContainer } from 'react-toastify';
import { StoryProvider } from '@/features/stories/context/StoryContext';
import App from "./app";

// Styles
import "./index.css";
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Home from "./features/stories/pages/Home";
import StoryDashboard from "./features/stories/pages/StoryDashboard";
import Chapters from "./features/chapters/pages/Chapters";
import ChapterEditorPage from "./features/chapters/pages/ChapterEditorPage";
import PromptsPage from "./features/prompts/pages/PromptsPage";
import AISettingsPage from "./features/ai/pages/AISettingsPage";
import { MainLayout } from "./components/MainLayout";
import LorebookPage from "./features/lorebook/pages/LorebookPage";
import { dbSeeder } from "./services/dbSeed";
// biome-ignore lint/style/noNonNullAssertion: <explanation>

function DatabaseInitializer({ children }: { children: React.ReactNode }) {
	const [isReady, setIsReady] = useState(false);
	const initAttempted = React.useRef(false);

	useEffect(() => {
		// Skip if already attempted (for StrictMode)
		if (initAttempted.current) return;
		initAttempted.current = true;

		const init = async () => {
			try {
				await dbSeeder.initialize();
			} catch (err) {
				console.error("Database initialization failed:", err);
			} finally {
				setIsReady(true);
			}
		};

		init();
	}, []);

	if (!isReady) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">Initializing StoryNexus</h2>
					<p className="text-muted-foreground">Setting up your writing environment...</p>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ThemeProvider defaultTheme="dark" storageKey="app-theme">
			<BrowserRouter>
				<DatabaseInitializer>
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
							</Route>

							{/* Story Dashboard */}
							<Route path="/dashboard/:storyId" element={<StoryDashboard />}>
								<Route path="chapters" element={<Chapters />} />
								<Route path="chapters/:chapterId" element={<ChapterEditorPage />} />
								<Route path="prompts" element={<PromptsPage />} />
								<Route path="lorebook" element={<LorebookPage />} />
							</Route>
						</Routes>
					</StoryProvider>
				</DatabaseInitializer>
				<ToastContainer />
			</BrowserRouter>
		</ThemeProvider>
	</React.StrictMode>
);