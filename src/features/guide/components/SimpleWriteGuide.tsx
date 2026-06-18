import type React from "react";
import { MousePointer2, PanelRightOpen, Pencil, Settings, Square, TextCursorInput } from "lucide-react";

export default function SimpleWriteGuide() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="mb-4 text-2xl font-bold">Simple Write Guide</h2>
                <p className="mb-6 text-muted-foreground">
                    Simple Write is the fastest way to continue prose from the editor cursor. It streams text directly into the chapter, then saves the chapter when generation completes.
                </p>
            </div>

            <section className="space-y-4">
                <h3 className="text-xl font-semibold">Use Simple Write</h3>
                <div className="grid gap-4 md:grid-cols-3">
                    <GuideCard
                        icon={<TextCursorInput className="h-5 w-5 text-primary" />}
                        title="Place The Cursor"
                        body="Click where the next prose should appear. Simple Write needs a collapsed cursor, not a selected range."
                    />
                    <GuideCard
                        icon={<Pencil className="h-5 w-5 text-primary" />}
                        title="Click Write"
                        body="Use the Write button in the editor toolbar. The app sends nearby context and streams the result into the chapter."
                    />
                    <GuideCard
                        icon={<Square className="h-5 w-5 text-primary" />}
                        title="Stop If Needed"
                        body="While text is streaming, the same control becomes Stop. Stopping keeps any text already inserted."
                    />
                </div>
            </section>

            <section className="space-y-4">
                <h3 className="text-xl font-semibold">What Context It Uses</h3>
                <ul className="ml-4 list-disc space-y-2 text-sm text-muted-foreground">
                    <li>Words before the cursor.</li>
                    <li>Matched lorebook entries from the current chapter.</li>
                    <li>Story language, chapter POV type, and POV character when available.</li>
                    <li>Words after the cursor when enabled in Simple Write settings or when using a custom prompt.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h3 className="text-xl font-semibold">Configure Simple Write</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <GuideCard
                        icon={<PanelRightOpen className="h-5 w-5 text-primary" />}
                        title="Open Settings"
                        body="Open Simple Write from the editor tool rail to choose the model and continuation behavior."
                    />
                    <GuideCard
                        icon={<Settings className="h-5 w-5 text-primary" />}
                        title="Choose The Prompt"
                        body="Use the supplied Simple Write prompt for quick continuation, or turn on Custom Prompt to use a Continue Writing prompt you control."
                    />
                </div>
                <div className="rounded-md border bg-muted/30 p-4">
                    <div className="mb-2 flex items-center gap-2 font-medium">
                        <MousePointer2 className="h-4 w-4" />
                        Include Words After Cursor
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Enable this when Simple Write should bridge into prose that already exists after the cursor. It helps with inserting a missing paragraph or smoothing a transition between two existing passages.
                    </p>
                </div>
            </section>

            <section className="space-y-4">
                <h3 className="text-xl font-semibold">When To Use It</h3>
                <div className="grid gap-3 md:grid-cols-2">
                    <UseCase title="Keep Momentum" body="Use Simple Write when the next sentence or paragraph is obvious and you want the draft to keep moving." />
                    <UseCase title="Bridge A Gap" body="Place the cursor between two passages and include after-cursor words so the model can connect them." />
                    <UseCase title="Stay In Flow" body="Use Simple Write for quick continuation; use Scene Beats when you need a specific instruction or structured generation step." />
                    <UseCase title="Respect Context" body="Add important people, places, and terms to the lorebook so matched entries can guide the continuation." />
                </div>
            </section>
        </div>
    );
}

function GuideCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
    return (
        <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 font-medium">
                {icon}
                {title}
            </div>
            <p className="text-sm text-muted-foreground">{body}</p>
        </div>
    );
}

function UseCase({ title, body }: { title: string; body: string }) {
    return (
        <div className="rounded-md border bg-card p-3">
            <div className="font-medium">{title}</div>
            <div className="text-sm text-muted-foreground">{body}</div>
        </div>
    );
}
