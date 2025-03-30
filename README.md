# The Story Nexus

A powerful AI-driven story writing desktop application built with Tauri, React, and TypeScript.

## Overview

The Story Nexus is a local-first desktop application designed for writers who want to leverage AI to enhance their creative writing process. It provides a comprehensive environment for creating, organizing, and developing stories with the assistance of AI-powered tools.

## Key Features

- **Story Management**: Create and organize your stories with chapters, outlines, and summaries
- **Rich Text Editor**: Write and edit your stories using a powerful Lexical-based editor
- **AI Integration**: Generate content using AI models from providers like OpenAI and OpenRouter or use a locally hosted model
- **Custom Prompts**: Create and manage custom prompts to guide AI generation
- **Scene Beats Addon to Editor**: Press alt (option for mac) + s in editor to open Scene Beat AI command
- **Lorebook**: Maintain a database of characters, locations, items, events, and notes for your story
- **Local-First**: All your data is stored locally using IndexedDB with DexieJS

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **State Management**: Zustand
- **Routing**: React Router v7
- **Storage**: IndexedDB with DexieJS
- **Text Editor**: Lexical
- **Desktop Framework**: Tauri v2
- **UI Components**: Shadcn UI, Lucide React icons
- **Notifications**: React Toastify

## Getting Started

### Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```

### Building

To build the application for production:

```
npm run build
```

To preview the production build:

```
npm run preview
```

To run Tauri commands:

```
npm run tauri
```

To run Tauri create debug release:

```
npm run tauri build -- --debug
```

To run Tauri create release build:

```
npm run tauri build
```

## Screenshots

![App Screenshot](screenshots/Home.jpg)
![App Screenshot](screenshots/Stories.jpg)
![App Screenshot](screenshots/Prompts.jpg)
![App Screenshot](screenshots/Lorebook.jpg)
![App Screenshot](screenshots/CreateChapter.jpg)
![App Screenshot](screenshots/Editor.jpg)
![App Screenshot](screenshots/Scenebeat.jpg)
![App Screenshot](screenshots/GeneratedProse.jpg)

## Project Structure

- `src/features/` - Main application features (stories, chapters, prompts, ai, lorebook)
- `src/components/` - Reusable UI components
- `src/Lexical/` - Text editor implementation
- `src/types/` - TypeScript type definitions
- `src/services/` - Application services
- `src/lib/` - Utility functions and helpers
- `src/hooks/` - Custom React hooks
- `src/pages/` - Application pages
