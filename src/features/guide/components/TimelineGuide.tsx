import type React from "react";
import { BadgeCheck, Clock, Link2, ListTree, PanelRightOpen, Sparkles } from "lucide-react";

export default function TimelineGuide() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="mb-4 text-2xl font-bold">Timeline Guide</h2>
                <p className="mb-6 text-muted-foreground">
                    Timeline tracks what happened in the story, in chapter order. It is separate from the Lorebook: the Lorebook stores people, places, and facts, while Timeline stores events.
                </p>
            </div>

            <section className="space-y-4">
                <h3 className="text-xl font-semibold">Use The Timeline</h3>
                <div className="grid gap-4 md:grid-cols-3">
                    <GuideCard
                        icon={<PanelRightOpen className="h-5 w-5 text-primary" />}
                        title="Open Timeline"
                        body="Open Timeline from the editor tool rail. Events are grouped by chapter in collapsed sections."
                    />
                    <GuideCard
                        icon={<ListTree className="h-5 w-5 text-primary" />}
                        title="Review Events"
                        body="Expand a chapter group to inspect events, reorder them within the chapter, disable them, or edit their details."
                    />
                    <GuideCard
                        icon={<Clock className="h-5 w-5 text-primary" />}
                        title="Keep Order"
                        body="Each event has a chapter and event order so the app can provide past events without leaking future events into prompts."
                    />
                </div>
            </section>

            <section className="space-y-4">
                <h3 className="text-xl font-semibold">Create Events</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <GuideCard
                        icon={<BadgeCheck className="h-5 w-5 text-primary" />}
                        title="Manual Events"
                        body="Use New Event when you want to record a plot beat yourself. Add a title, summary, chapter, participants, location, and optional time label."
                    />
                    <GuideCard
                        icon={<Sparkles className="h-5 w-5 text-primary" />}
                        title="Extract From Chapter"
                        body="Use Extract in the editor and choose Timeline. The AI returns structured events that are saved into the Timeline after you accept them."
                    />
                </div>
            </section>

            <section className="space-y-4">
                <h3 className="text-xl font-semibold">Participants And Lorebook Links</h3>
                <div className="rounded-md border bg-muted/30 p-4">
                    <div className="mb-2 flex items-center gap-2 font-medium">
                        <Link2 className="h-4 w-4" />
                        Linked Participants
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Timeline participants link to character entries in the Lorebook when the extracted name exactly matches the character name or one of its aliases. If the app cannot match a name, it keeps that name as an unresolved participant so you can edit it later.
                    </p>
                </div>
                <ul className="ml-4 list-disc space-y-2 text-sm text-muted-foreground">
                    <li>Add short names, titles, or common references to a character's Lorebook aliases when you want extraction to link them reliably.</li>
                    <li>Use unresolved participants for names that should stay visible even before you decide whether they need a Lorebook entry.</li>
                    <li>Disabled timeline events are hidden from generated context.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h3 className="text-xl font-semibold">AI Context</h3>
                <p className="text-muted-foreground">
                    Timeline context can be used by prompts and agentic checks to keep chronology straight. Current prompts can request the full timeline up to the active chapter or only the active chapter's events.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                    <Variable name="{{timeline}}" body="Events up to the current chapter." />
                    <Variable name="{{timeline_up_to_current_chapter}}" body="Explicit version of the same context." />
                    <Variable name="{{timeline_current_chapter}}" body="Only events attached to the active chapter." />
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

function Variable({ name, body }: { name: string; body: string }) {
    return (
        <div className="rounded-md border bg-card p-3">
            <div className="font-mono text-sm font-medium">{name}</div>
            <div className="mt-1 text-sm text-muted-foreground">{body}</div>
        </div>
    );
}
