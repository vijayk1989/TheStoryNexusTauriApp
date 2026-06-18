import type React from "react";
import {
    Bot,
    BookOpen,
    FilePlus,
    PanelRightOpen,
    PenLine,
    Save,
    Settings,
    Sparkles,
} from "lucide-react";

export default function BasicsGuide() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="mb-4 text-2xl font-bold">The Basics</h2>
                <p className="mb-6 text-muted-foreground">
                    The Story Nexus is now centered on one writing workspace. Choose a story and chapter from the left rail, write in the editor, and open supporting tools from the right rail when you need them.
                </p>
            </div>

            <div className="space-y-6">
                <GuideStep
                    number="1"
                    icon={<BookOpen className="h-5 w-5 text-primary" />}
                    title="Pick Or Create A Story"
                >
                    <p>
                        The left rail is your story and chapter navigator. Use the story selector at the top to switch projects, or open the menu beside it to create, import, edit, export, or delete a story.
                    </p>
                    <ul className="ml-4 list-disc space-y-2 text-sm text-muted-foreground">
                        <li>Stories are containers for chapters and story-scoped context.</li>
                        <li>The app remembers your last edited story and chapter.</li>
                        <li>Imported and exported stories use local files, keeping the workflow local-first.</li>
                    </ul>
                </GuideStep>

                <GuideStep
                    number="2"
                    icon={<FilePlus className="h-5 w-5 text-primary" />}
                    title="Create A Chapter"
                >
                    <p>
                        In the left rail, click <strong>New</strong> under Chapters. Give the chapter a title and, if useful, set the point of view type and POV character.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Chapters can be reordered by dragging them in the chapter list. Each chapter has its own content, summary, outline, notes, POV data, drafts, and matched lore context.
                    </p>
                </GuideStep>

                <GuideStep
                    number="3"
                    icon={<PenLine className="h-5 w-5 text-primary" />}
                    title="Write In The Editor"
                >
                    <p>
                        Select a chapter and start writing directly in the editor. The top bar shows the active chapter name and autosave state.
                    </p>
                    <div className="rounded-md border bg-muted/30 p-4">
                        <div className="mb-2 flex items-center gap-2 font-medium">
                            <Save className="h-4 w-4" />
                            Autosave
                        </div>
                        <p className="text-sm text-muted-foreground">
                            The editor saves automatically after changes. The status indicator shows when work is saved, saving, waiting to save, or if a save failed.
                        </p>
                    </div>
                </GuideStep>

                <GuideStep
                    number="4"
                    icon={<Settings className="h-5 w-5 text-primary" />}
                    title="Connect AI"
                >
                    <p>
                        Open <strong>AI Settings</strong> from the right tool rail. Add an API key for your preferred hosted provider or configure a local OpenAI-compatible endpoint.
                    </p>
                    <div className="grid gap-4 md:grid-cols-3">
                        <InfoCard
                            title="OpenRouter"
                            body="Good default choice for model variety. Current defaults prefer Google Gemma through OpenRouter when a key is available."
                        />
                        <InfoCard
                            title="Local"
                            body="Use a local server such as LM Studio or another OpenAI-compatible endpoint. This is the fallback when OpenRouter is not configured."
                        />
                        <InfoCard
                            title="Other Providers"
                            body="OpenAI, Google, NanoGPT, and custom OpenAI-compatible providers are available from AI Settings."
                        />
                    </div>
                </GuideStep>

                <GuideStep
                    number="5"
                    icon={<Sparkles className="h-5 w-5 text-primary" />}
                    title="Generate Prose"
                >
                    <div className="space-y-5">
                        <div className="space-y-3">
                            <h4 className="font-medium">Scene Beats</h4>
                            <p>
                                Scene Beats are inline instructions for AI prose generation. Insert one in the editor, describe what should happen, choose a prompt/model or agentic pipeline, and generate.
                            </p>
                            <ol className="ml-4 list-decimal space-y-2 text-sm text-muted-foreground">
                                <li>Add a Scene Beat in the editor.</li>
                                <li>Write a specific instruction, such as a character reaction, conflict beat, or transition.</li>
                                <li>Choose normal generation, multi-model comparison, or Agentic Mode.</li>
                                <li>Accept the generated prose when it fits, or reject and revise the instruction.</li>
                            </ol>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <div className="h-px flex-1 bg-border" />
                            Or
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-medium">Simple Write</h4>
                            <p>
                                Simple Write continues from the cursor without adding an inline instruction block. Use it when the next sentence or paragraph is already clear and you want to keep drafting.
                            </p>
                            <ol className="ml-4 list-decimal space-y-2 text-sm text-muted-foreground">
                                <li>Place the cursor where new prose should appear.</li>
                                <li>Click <strong>Write</strong> in the editor toolbar.</li>
                                <li>Let the text stream into the chapter, or click <strong>Stop</strong> to keep what has already appeared.</li>
                                <li>Open Simple Write from the tool rail to change its prompt, model, or after-cursor context behavior.</li>
                            </ol>
                        </div>
                    </div>
                </GuideStep>

                <GuideStep
                    number="6"
                    icon={<PanelRightOpen className="h-5 w-5 text-primary" />}
                    title="Use The Right Tool Rail"
                >
                    <p>
                        Most story tools now open as right-side sheets from the editor. You do not need to leave the writing workspace to manage context or settings.
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                        <ToolItem name="Matched Aliases" body="See lorebook entries matched in the current chapter." />
                        <ToolItem name="Outline" body="Edit the current chapter outline." />
                        <ToolItem name="Chapter Notes" body="Keep chapter-specific notes and scratch work." />
                        <ToolItem name="Drafts" body="Review saved generated prose drafts." />
                        <ToolItem name="Brainstorm" body="Chat about ideas, manage brainstorm chats, and extract lore JSON." />
                        <ToolItem name="Lorebook" body="Create and manage characters, places, events, and other context." />
                        <ToolItem name="Prompts" body="Edit prompt templates and allowed models." />
                        <ToolItem name="Agents" body="Create reusable agents and multi-step pipelines." />
                    </div>
                </GuideStep>

                <div className="rounded-lg border bg-muted/30 p-6">
                    <h3 className="mb-4 text-xl font-semibold">A Good First Workflow</h3>
                    <ol className="ml-4 list-decimal space-y-2 text-sm text-muted-foreground">
                        <li>Create a story and first chapter.</li>
                        <li>Add key characters or places in the Lorebook.</li>
                        <li>Write a rough opening paragraph manually.</li>
                        <li>Add a Scene Beat for the next moment.</li>
                        <li>Use Brainstorm when you get stuck, then return to the chapter.</li>
                        <li>Use Outline and Chapter Notes to keep the chapter focused.</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}

function GuideStep({
    number,
    icon,
    title,
    children,
}: {
    number: string;
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-4 border-l-4 border-primary py-2 pl-4">
            <h3 className="flex items-center gap-2 text-xl font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {number}
                </span>
                {icon}
                {title}
            </h3>
            <div className="space-y-4">{children}</div>
        </section>
    );
}

function InfoCard({ title, body }: { title: string; body: string }) {
    return (
        <div className="rounded-lg border bg-card p-4">
            <h4 className="mb-2 font-medium">{title}</h4>
            <p className="text-sm text-muted-foreground">{body}</p>
        </div>
    );
}

function ToolItem({ name, body }: { name: string; body: string }) {
    return (
        <div className="rounded-md border bg-card p-3">
            <div className="font-medium">{name}</div>
            <div className="text-sm text-muted-foreground">{body}</div>
        </div>
    );
}
