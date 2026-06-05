import {
    AlertCircle,
    Bot,
    Braces,
    CheckCircle2,
    ClipboardCheck,
    FileSearch,
    GitBranch,
    ListChecks,
    RefreshCw,
    SlidersHorizontal,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const panelClasses = "rounded-md border bg-background p-4";

export default function AdvancedGuide() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="mb-4 text-2xl font-bold">Advanced Agents Guide</h2>
                <p className="mb-6 text-muted-foreground">
                    Use this guide when the basic agent workflow is working and you want better control over prompts, injected context, revision behavior, and pipeline conditions.
                </p>
            </div>

            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important Distinction</AlertTitle>
                <AlertDescription>
                    Agent prompts are not the same as reusable prompts in the Prompts tool. Agent system prompts define the agent's behavior, while the pipeline engine injects SceneBeat input, Brainstorm input, story context, previous outputs, and feedback into the user message for each step.
                </AlertDescription>
            </Alert>

            <Tabs defaultValue="prompting" className="w-full">
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                    <TabsList className="mb-6 inline-flex w-max md:grid md:w-full md:grid-cols-5">
                        <TabsTrigger value="prompting">Prompting</TabsTrigger>
                        <TabsTrigger value="context">Variables</TabsTrigger>
                        <TabsTrigger value="conditions">Conditions</TabsTrigger>
                        <TabsTrigger value="revision">Revision</TabsTrigger>
                        <TabsTrigger value="debugging">Debugging</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="prompting" className="space-y-6">
                    <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-xl font-semibold">
                            <Bot className="h-5 w-5 text-primary" />
                            Prompt Each Agent for One Job
                        </h3>
                        <p className="text-muted-foreground">
                            The best pipelines use small, specialized prompts. Each agent should know its job, output shape, and limits.
                        </p>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className={panelClasses}>
                                <h4 className="mb-2 font-medium">Prose writer</h4>
                                <p className="text-sm text-muted-foreground">
                                    Ask for finished story text. Tell it to preserve continuity, follow the SceneBeat instruction, and avoid commentary.
                                </p>
                            </div>
                            <div className={panelClasses}>
                                <h4 className="mb-2 font-medium">Judge or checker</h4>
                                <p className="text-sm text-muted-foreground">
                                    Ask for a strict verdict. Use predictable words like <span className="font-mono text-foreground">CONSISTENT</span> and <span className="font-mono text-foreground">ISSUE</span> so later conditions can read the result.
                                </p>
                            </div>
                            <div className={panelClasses}>
                                <h4 className="mb-2 font-medium">Summarizer</h4>
                                <p className="text-sm text-muted-foreground">
                                    Ask for a compressed factual recap. Keep temperature low and request names, goals, locations, unresolved conflicts, and recent events.
                                </p>
                            </div>
                            <div className={panelClasses}>
                                <h4 className="mb-2 font-medium">Style editor</h4>
                                <p className="text-sm text-muted-foreground">
                                    Ask it to polish the previous prose without changing plot facts. This role is useful near the end of a pipeline.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-md border bg-muted/30 p-4">
                            <h4 className="mb-2 flex items-center gap-2 font-medium">
                                <ClipboardCheck className="h-4 w-4 text-primary" />
                                Prompt Pattern
                            </h4>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p><strong className="text-foreground">Identity:</strong> You are a continuity checker for long-form fiction.</p>
                                <p><strong className="text-foreground">Task:</strong> Compare the new prose against the provided story context and lore.</p>
                                <p><strong className="text-foreground">Output:</strong> Return <span className="font-mono text-foreground">CONSISTENT</span> if there are no problems. Otherwise return <span className="font-mono text-foreground">ISSUE:</span> followed by concise bullets.</p>
                                <p><strong className="text-foreground">Boundary:</strong> Do not rewrite the prose.</p>
                            </div>
                        </div>
                    </section>
                </TabsContent>

                <TabsContent value="context" className="space-y-6">
                    <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-xl font-semibold">
                            <Braces className="h-5 w-5 text-primary" />
                            Injecting Content with Context and Variables
                        </h3>
                        <p className="text-muted-foreground">
                            Agents receive most content through their role and context settings. Reusable Prompts use <span className="font-mono">{"{{variables}}"}</span>. Pipeline revision prompts use a smaller placeholder set.
                        </p>

                        <div className="overflow-hidden rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="p-3 text-left font-medium">Mechanism</th>
                                        <th className="p-3 text-left font-medium">Where to use it</th>
                                        <th className="p-3 text-left font-medium">What it injects</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    <tr>
                                        <td className="p-3 font-medium">Agent context settings</td>
                                        <td className="p-3 text-muted-foreground">Agent form</td>
                                        <td className="p-3 text-muted-foreground">Lorebook entries, previous text, chapter summary, POV</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-medium">Prompt variables</td>
                                        <td className="p-3 text-muted-foreground">Prompts tool, Preview Prompt</td>
                                        <td className="p-3 text-muted-foreground">SceneBeat, Brainstorm context, selected text, chapter data, lorebook data</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-medium">Revision placeholders</td>
                                        <td className="p-3 text-muted-foreground">Pipeline step push prompt</td>
                                        <td className="p-3 text-muted-foreground">Previous prose and checker feedback</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-medium">Pipeline conditions</td>
                                        <td className="p-3 text-muted-foreground">Pipeline step condition</td>
                                        <td className="p-3 text-muted-foreground">Controls whether a step runs</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className={panelClasses}>
                                <h4 className="mb-2 font-medium">Common prompt variables</h4>
                                <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                                    <li><span className="font-mono text-foreground">{"{{scenebeat}}"}</span> inserts the current SceneBeat or Brainstorm input.</li>
                                    <li><span className="font-mono text-foreground">{"{{scenebeat_context}}"}</span> inserts selected SceneBeat lore context.</li>
                                    <li><span className="font-mono text-foreground">{"{{brainstorm_context}}"}</span> inserts selected Brainstorm context.</li>
                                    <li><span className="font-mono text-foreground">{"{{previous_words(500)}}"}</span> inserts the last 500 words of context.</li>
                                    <li><span className="font-mono text-foreground">{"{{chapter_data(2)}}"}</span> inserts chapter 2 plain text.</li>
                                </ul>
                            </div>
                            <div className={panelClasses}>
                                <h4 className="mb-2 font-medium">Pipeline placeholders</h4>
                                <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                                    <li><span className="font-mono text-foreground">{"{{PREVIOUS_OUTPUT}}"}</span> inserts the earlier prose or last relevant agent output.</li>
                                    <li><span className="font-mono text-foreground">{"{{FEEDBACK}}"}</span> inserts the previous checker or judge response.</li>
                                    <li>These placeholders are for revision push prompts, not normal reusable prompts.</li>
                                </ul>
                            </div>
                        </div>

                        <Alert>
                            <FileSearch className="h-4 w-4" />
                            <AlertTitle>Preview Before You Trust It</AlertTitle>
                            <AlertDescription>
                                In normal SceneBeat and Brainstorm prompting, use <strong>Preview Prompt</strong> to see resolved variables. In Agentic Mode, use diagnostics after generation to inspect the messages sent to each agent.
                            </AlertDescription>
                        </Alert>
                    </section>
                </TabsContent>

                <TabsContent value="conditions" className="space-y-6">
                    <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-xl font-semibold">
                            <GitBranch className="h-5 w-5 text-primary" />
                            Use Conditions to Control the Pipeline
                        </h3>
                        <p className="text-muted-foreground">
                            Conditions let a step run only when the pipeline state matches a rule. They work best when previous agents return predictable markers.
                        </p>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className={panelClasses}>
                                <div className="mb-2 flex items-center gap-2">
                                    <Badge variant="outline">wordCount &gt; 3000</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Run a summarizer only when the input context is long.
                                </p>
                            </div>
                            <div className={panelClasses}>
                                <div className="mb-2 flex items-center gap-2">
                                    <Badge variant="outline">hasLorebookEntries</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Run a lore judge only when lore context exists.
                                </p>
                            </div>
                            <div className={panelClasses}>
                                <div className="mb-2 flex items-center gap-2">
                                    <Badge variant="outline">roleOutputContains:lore_judge:ISSUE</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Run a revision step only if the lore judge explicitly found an issue.
                                </p>
                            </div>
                            <div className={panelClasses}>
                                <div className="mb-2 flex items-center gap-2">
                                    <Badge variant="outline">anyJudgeFoundIssues</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Run one revision step when any judge or checker reports a problem.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-md border bg-muted/30 p-4">
                            <h4 className="mb-2 flex items-center gap-2 font-medium">
                                <ListChecks className="h-4 w-4 text-primary" />
                                Condition-Friendly Judge Output
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                Ask judges to return <span className="font-mono text-foreground">CONSISTENT</span> for a pass and <span className="font-mono text-foreground">ISSUE:</span> for a failure. This makes conditions more reliable than asking for a free-form critique.
                            </p>
                        </div>
                    </section>
                </TabsContent>

                <TabsContent value="revision" className="space-y-6">
                    <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-xl font-semibold">
                            <RefreshCw className="h-5 w-5 text-primary" />
                            Design a Revision Step
                        </h3>
                        <p className="text-muted-foreground">
                            A revision step should run after at least one writer and one judge. Mark it as a revision step so it receives the original prose and feedback.
                        </p>

                        <div className="space-y-3 rounded-md border bg-background p-4">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <Badge>1</Badge>
                                <span>Prose Writer</span>
                                <span className="text-muted-foreground">then</span>
                                <Badge variant="outline">2</Badge>
                                <span>Lore Judge</span>
                                <span className="text-muted-foreground">then</span>
                                <Badge variant="secondary">3</Badge>
                                <span>Prose Writer revision</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Put <span className="font-mono text-foreground">anyJudgeFoundIssues</span> or <span className="font-mono text-foreground">roleOutputContains:lore_judge:ISSUE</span> on the revision step.
                            </p>
                        </div>

                        <div className={panelClasses}>
                            <h4 className="mb-2 font-medium">Custom push prompt example</h4>
                            <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-muted-foreground">{`Review your previous answer and the feedback.

PREVIOUS OUTPUT:
{{PREVIOUS_OUTPUT}}

FEEDBACK:
{{FEEDBACK}}

Rewrite the prose so every issue is addressed. Preserve the original intent, POV, and style. Return only the revised prose.`}</pre>
                        </div>

                        <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle>Streaming Rule</AlertTitle>
                            <AlertDescription>
                                Stream only the writer or final polish step that should appear to the user. Keep summarizers, judges, and checkers silent.
                            </AlertDescription>
                        </Alert>
                    </section>
                </TabsContent>

                <TabsContent value="debugging" className="space-y-6">
                    <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-xl font-semibold">
                            <SlidersHorizontal className="h-5 w-5 text-primary" />
                            Debug and Tune Pipelines
                        </h3>
                        <p className="text-muted-foreground">
                            When a pipeline behaves strangely, inspect one step at a time. The problem is usually missing context, vague output rules, or a condition that never matches.
                        </p>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className={panelClasses}>
                                <h4 className="mb-2 font-medium">Open diagnostics</h4>
                                <p className="text-sm text-muted-foreground">
                                    Use SceneBeat diagnostics or Brainstorm diagnostics to see which agents ran, what they returned, and which step produced the visible answer.
                                </p>
                            </div>
                            <div className={panelClasses}>
                                <h4 className="mb-2 font-medium">Check context size</h4>
                                <p className="text-sm text-muted-foreground">
                                    If the model drifts, include more previous text or lore. If it rambles or ignores instructions, narrow the context.
                                </p>
                            </div>
                            <div className={panelClasses}>
                                <h4 className="mb-2 font-medium">Tune temperature</h4>
                                <p className="text-sm text-muted-foreground">
                                    Writers can use higher temperature. Summarizers and judges usually work better with lower temperature.
                                </p>
                            </div>
                            <div className={panelClasses}>
                                <h4 className="mb-2 font-medium">Verify final output</h4>
                                <p className="text-sm text-muted-foreground">
                                    If the last step is a judge, the final step output may be diagnostic text. Put a writer, editor, or revision step last when you want prose.
                                </p>
                            </div>
                        </div>
                    </section>
                </TabsContent>
            </Tabs>
        </div>
    );
}
