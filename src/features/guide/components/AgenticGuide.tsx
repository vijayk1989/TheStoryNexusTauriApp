import {
    Activity,
    Bot,
    CheckCircle,
    FileText,
    MessageSquare,
    PanelRightOpen,
    PenLine,
    Play,
    Route,
    Sparkles,
    Workflow,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const stepClasses = "rounded-md border bg-background p-4";

export default function AgenticGuide() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="mb-4 text-2xl font-bold">Simple Agents Guide</h2>
                <p className="mb-6 text-muted-foreground">
                    Agents are reusable AI workers. A pipeline is an ordered set of agents. Together, they let you turn one SceneBeat or Brainstorm message into a small workflow, such as draft prose, check the result, then polish it.
                </p>
            </div>

            <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>The Short Version</AlertTitle>
                <AlertDescription>
                    Create one agent for a job, add it to a pipeline, then turn on Agentic Mode in SceneBeat or Brainstorm and choose that pipeline.
                </AlertDescription>
            </Alert>

            <Tabs defaultValue="agent" className="w-full">
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                    <TabsList className="mb-6 inline-flex w-max md:grid md:w-full md:grid-cols-4">
                        <TabsTrigger value="agent">Create Agent</TabsTrigger>
                        <TabsTrigger value="pipeline">Create Pipeline</TabsTrigger>
                        <TabsTrigger value="scenebeat">SceneBeat</TabsTrigger>
                        <TabsTrigger value="brainstorm">Brainstorm</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="agent" className="space-y-6">
                    <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-xl font-semibold">
                            <Bot className="h-5 w-5 text-primary" />
                            Create Your First Agent
                        </h3>
                        <p className="text-muted-foreground">
                            Start with one simple role. A good first agent is a prose writer because it can take your instruction and produce the visible draft.
                        </p>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className={stepClasses}>
                                <div className="mb-2 flex items-center gap-2 font-medium">
                                    <PanelRightOpen className="h-4 w-4 text-primary" />
                                    1. Open Agents
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    From the chapter editor, open the right tool rail and choose <strong>Agents</strong>.
                                </p>
                            </div>
                            <div className={stepClasses}>
                                <div className="mb-2 flex items-center gap-2 font-medium">
                                    <PenLine className="h-4 w-4 text-primary" />
                                    2. Add a New Agent
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Give it a clear name, such as <strong>Direct Scene Writer</strong>, then choose the <strong>Prose Writer</strong> role.
                                </p>
                            </div>
                            <div className={stepClasses}>
                                <div className="mb-2 flex items-center gap-2 font-medium">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    3. Pick a Model
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Use your best creative model for prose. Utility agents like summarizers and judges can use faster, cheaper models later.
                                </p>
                            </div>
                            <div className={stepClasses}>
                                <div className="mb-2 flex items-center gap-2 font-medium">
                                    <FileText className="h-4 w-4 text-primary" />
                                    4. Set Context
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Leave the role defaults at first. For a prose writer, matched lorebook entries, previous text, chapter summary, and POV are usually helpful.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-md border bg-muted/30 p-4">
                            <h4 className="mb-2 font-medium">Simple prose writer prompt</h4>
                            <p className="text-sm text-muted-foreground">
                                Use the default prompt, or write a short version like: <span className="font-mono text-foreground">Write immersive fiction prose from the instruction. Preserve continuity, use the supplied context, and return only story text.</span>
                            </p>
                        </div>
                    </section>
                </TabsContent>

                <TabsContent value="pipeline" className="space-y-6">
                    <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-xl font-semibold">
                            <Workflow className="h-5 w-5 text-primary" />
                            Build a Simple Pipeline
                        </h3>
                        <p className="text-muted-foreground">
                            A pipeline is a recipe. It decides which agents run, what each step receives from the previous step, whether a step should appear in the UI, and whether a later step should run only when a condition is met.
                        </p>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className={stepClasses}>
                                <div className="mb-2 flex items-center gap-2 font-medium">
                                    <Workflow className="h-4 w-4 text-primary" />
                                    What a Pipeline Step Controls
                                </div>
                                <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                                    <li><strong className="text-foreground">Agent:</strong> which saved agent runs for this step.</li>
                                    <li><strong className="text-foreground">Order:</strong> earlier outputs become context for later steps.</li>
                                    <li><strong className="text-foreground">Condition:</strong> optional rule that can skip the step.</li>
                                    <li><strong className="text-foreground">Stream output:</strong> whether this step's tokens appear live in SceneBeat or Brainstorm.</li>
                                    <li><strong className="text-foreground">Revision step:</strong> sends previous prose and judge feedback to a rewrite agent.</li>
                                </ul>
                            </div>
                            <div className={stepClasses}>
                                <div className="mb-2 flex items-center gap-2 font-medium">
                                    <FileText className="h-4 w-4 text-primary" />
                                    How Data Moves
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    The SceneBeat or Brainstorm message starts the pipeline. A prose writer can create a draft, a judge can inspect that draft, and a later writer can revise it using the judge's feedback.
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    The final user-facing answer should usually come from the last writer, editor, expander, or dialogue specialist step.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 rounded-md border bg-background p-4">
                            <h4 className="font-medium">Example 1: Quick Scene Draft</h4>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge>Step 1</Badge>
                                <span className="font-medium">Direct Scene Writer</span>
                                <span className="text-sm text-muted-foreground">condition none, stream output on</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                This is the fastest useful pipeline: it takes the SceneBeat or Brainstorm input and writes the answer with your chosen prose writer.
                            </p>
                        </div>

                        <div className="space-y-4 rounded-md border bg-background p-4">
                            <div>
                                <h4 className="font-medium">Example 2: Prose Writer, Lore Judge, Rewrite</h4>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Use this when you want prose, an automatic lore check, and a rewrite only if the check finds a problem.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="rounded-md border bg-muted/20 p-3">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <Badge>Step 1</Badge>
                                        <span className="font-medium">Prose Writer</span>
                                        <span className="text-sm text-muted-foreground">condition none, stream output on</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Writes the first draft from the SceneBeat or Brainstorm request. Use a creative model and include matched lore, previous text, summary, and POV.
                                    </p>
                                </div>

                                <div className="rounded-md border bg-muted/20 p-3">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">Step 2</Badge>
                                        <span className="font-medium">Lore Judge</span>
                                        <span className="text-sm text-muted-foreground">condition hasLorebookEntries, stream output off</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Checks the draft against lorebook context. Prompt it to return <span className="font-mono text-foreground">CONSISTENT</span> when the draft passes and <span className="font-mono text-foreground">ISSUE:</span> when something needs fixing.
                                    </p>
                                </div>

                                <div className="rounded-md border bg-muted/20 p-3">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <Badge variant="secondary">Step 3</Badge>
                                        <span className="font-medium">Prose Writer Rewrite</span>
                                        <span className="text-sm text-muted-foreground">condition roleOutputContains:lore_judge:ISSUE, revision on, stream output on</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Runs only when the lore judge reports an issue. Turn on <strong>Revision step</strong> so the writer receives the original prose and the judge feedback.
                                    </p>
                                </div>
                            </div>

                            <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertTitle>Why This Works</AlertTitle>
                                <AlertDescription>
                                    The writer creates the prose, the judge produces a predictable pass/fail marker, and the rewrite step uses that marker as its condition. This keeps the pipeline simple while still giving you an automatic recovery path.
                                </AlertDescription>
                            </Alert>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className={stepClasses}>
                                <div className="mb-2 font-medium">1. Create or Pick Agents</div>
                                <p className="text-sm text-muted-foreground">
                                    Build the agents first, then assemble them in the Pipelines tab. The same prose writer can be used for both draft and rewrite steps.
                                </p>
                            </div>
                            <div className={stepClasses}>
                                <div className="mb-2 font-medium">2. Set Conditions Carefully</div>
                                <p className="text-sm text-muted-foreground">
                                    Leave always-needed steps blank. Add conditions only to steps that should sometimes be skipped.
                                </p>
                            </div>
                            <div className={stepClasses}>
                                <div className="mb-2 font-medium">3. Stream Only Useful Text</div>
                                <p className="text-sm text-muted-foreground">
                                    Stream prose-producing steps. Keep judges, checkers, and summarizers silent so diagnostic text does not appear as story text.
                                </p>
                            </div>
                        </div>
                    </section>
                </TabsContent>

                <TabsContent value="scenebeat" className="space-y-6">
                    <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-xl font-semibold">
                            <Route className="h-5 w-5 text-primary" />
                            Use a Pipeline in SceneBeat
                        </h3>
                        <p className="text-muted-foreground">
                            SceneBeat pipelines are for writing chapter prose inside the editor.
                        </p>

                        <ol className="space-y-3">
                            <li className={stepClasses}>
                                <strong>1. Insert a SceneBeat.</strong>
                                <span className="ml-1 text-muted-foreground">Use the editor shortcut or SceneBeat insertion flow, then type the scene instruction.</span>
                            </li>
                            <li className={stepClasses}>
                                <strong>2. Turn on Agentic Mode.</strong>
                                <span className="ml-1 text-muted-foreground">The normal prompt/model controls switch to pipeline controls.</span>
                            </li>
                            <li className={stepClasses}>
                                <strong>3. Choose your pipeline.</strong>
                                <span className="ml-1 text-muted-foreground">Start with your one-step pipeline, then click <strong>Generate with Pipeline</strong>.</span>
                            </li>
                            <li className={stepClasses}>
                                <strong>4. Review the draft.</strong>
                                <span className="ml-1 text-muted-foreground">Accept it into the chapter, reject it, regenerate, save a draft, or open diagnostics.</span>
                            </li>
                        </ol>
                    </section>
                </TabsContent>

                <TabsContent value="brainstorm" className="space-y-6">
                    <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-xl font-semibold">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            Use a Pipeline in Brainstorm
                        </h3>
                        <p className="text-muted-foreground">
                            Brainstorm pipelines are for multi-step thinking: generating options, checking ideas, extracting outlines, or revising a plan before it reaches your draft.
                        </p>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className={stepClasses}>
                                <div className="mb-2 flex items-center gap-2 font-medium">
                                    <Play className="h-4 w-4 text-primary" />
                                    Run the Pipeline
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Open Brainstorm, turn on <strong>Agentic Mode</strong>, choose a pipeline, type your request, then send it.
                                </p>
                            </div>
                            <div className={stepClasses}>
                                <div className="mb-2 flex items-center gap-2 font-medium">
                                    <Activity className="h-4 w-4 text-primary" />
                                    Check Diagnostics
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Turn on diagnostics to see the step log. This is the quickest way to learn which agent needs a better prompt.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-md border bg-muted/30 p-4">
                            <h4 className="mb-2 font-medium">A useful Brainstorm pipeline</h4>
                            <p className="text-sm text-muted-foreground">
                                Try <strong>Idea Generator</strong> then <strong>Continuity Checker</strong>. The first agent proposes options; the second flags anything that clashes with your selected context.
                            </p>
                        </div>
                    </section>
                </TabsContent>
            </Tabs>
        </div>
    );
}
