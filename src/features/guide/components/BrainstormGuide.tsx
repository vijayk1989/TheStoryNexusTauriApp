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
                        <Bot className="h-5 w-5 text-primary" />
                        Background Generation
                    </h3>
                    <p className="text-muted-foreground">
                        Close Brainstorm or switch chats while a response is generating and keep writing. The task continues while the app stays open. Return to the chat to see its progress or completed response. Each chat shows its task status, and Stop cancels only that chat's generation. Deleting a chat also cancels its task.
                    </p>
                </section>

                <section className="space-y-3">
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                        <PanelRightOpen className="h-5 w-5 text-primary" />
                        Where Brainstorm Lives
                    </h3>
                    <p className="text-muted-foreground">
                        Open <strong>Brainstorm</strong> from the editor's right tool rail. It appears as a slide-out sheet, so you can keep the current chapter open while you talk through ideas. Drag the horizontal divider above Context down to give responses more room, or up to enlarge the input panel. The input panel scrolls when needed, and your preferred split is remembered. You can also focus the divider and use the arrow keys to resize it.
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
                        <li>Unsent message text is saved locally per chat and restored when you reopen the app.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                        <FileJson className="h-5 w-5 text-primary" />
                        Prompt Drafts
                    </h3>
                    <p className="text-muted-foreground">
                        Use Prompt drafts beside the input to save an idea without sending it, or load a saved idea. Loading into an occupied input offers Append or Replace. SceneBeat has the same menu. Open Drafts in the editor tool rail and choose Prompt Drafts to rename, copy, or delete saved ideas for this story; Response Drafts keeps generated prose separately. Saved prompt drafts remain available after their original chat or SceneBeat is deleted.
                    </p>
                    <p className="text-muted-foreground">
                        Prompt and model selectors have their own row, with input actions below. The pencil button edits the selected prompt template. Image resizing is configured under Prompt Defaults using Resize large Brainstorm images, and applies to newly attached images.
                    </p>
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
