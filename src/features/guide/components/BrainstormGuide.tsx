import { Bot, FileJson, MessageSquarePlus, PanelRightOpen, Sparkles } from "lucide-react";

export default function BrainstormGuide() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="mb-4 text-2xl font-bold">Brainstorm Guide</h2>
                <p className="mb-6 text-muted-foreground">
                    Brainstorm is a story-scoped AI chat for developing ideas, working through blocks, and turning loose notes into usable story material.
                </p>
            </div>

            <div className="space-y-6">
                <section className="space-y-3">
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                        <PanelRightOpen className="h-5 w-5 text-primary" />
                        Where Brainstorm Lives
                    </h3>
                    <p className="text-muted-foreground">
                        Open <strong>Brainstorm</strong> from the editor's right tool rail. It appears as a slide-out sheet, so you can keep the current chapter open while you talk through ideas.
                    </p>
                </section>

                <section className="space-y-3">
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                        <MessageSquarePlus className="h-5 w-5 text-primary" />
                        Managing Chats
                    </h3>
                    <ul className="ml-4 list-disc space-y-2 text-muted-foreground">
                        <li>Use the selector at the top of the Brainstorm sheet to switch chats.</li>
                        <li>Create a new chat with the plus button.</li>
                        <li>Rename or delete chats from the selector menu.</li>
                        <li>Chats are saved with the current story.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Context And Prompts
                    </h3>
                    <p className="text-muted-foreground">
                        Brainstorm can include chapter summaries, chapter content, lorebook entries, full story context, and web search. Normal mode uses brainstorm prompts and models. Prompt Defaults can preselect your preferred brainstorm prompt and model.
                    </p>
                </section>

                <section className="space-y-3">
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                        <FileJson className="h-5 w-5 text-primary" />
                        Structured Output
                    </h3>
                    <p className="text-muted-foreground">
                        Use the Output selector when you want Brainstorm to return lorebook entries, a chapter outline, story decisions, or open questions in a format the app can save.
                    </p>
                </section>

                <section className="space-y-3">
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                        <Bot className="h-5 w-5 text-primary" />
                        Agentic Mode
                    </h3>
                    <p className="text-muted-foreground">
                        Turn on Agentic Mode when you want a multi-step pipeline instead of a single response. This is useful for workflows like summarize context, draft ideas, check consistency, then revise.
                    </p>
                </section>
            </div>
        </div>
    );
}
