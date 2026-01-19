import {
    Bot,
    Sparkles,
    Workflow,
    CheckCircle,
    AlertTriangle,
    Stethoscope,
    Settings,
    RefreshCw,
    Zap,
    BookOpen,
    Shield,
    Clock,
    GitBranch,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AgenticGuide() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-4">Agentic AI Guide</h2>
                <p className="text-muted-foreground mb-6">
                    Learn how to use multi-agent AI pipelines to generate higher quality prose with automatic quality checking and revision. 
                    Agentic mode chains multiple specialized AI agents together, each with a specific role in the content generation process.
                </p>
            </div>

            <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>What Makes It Different?</AlertTitle>
                <AlertDescription>
                    Traditional generation uses a single AI call. Agentic mode uses multiple specialized agents working together — 
                    a summarizer to manage context, a prose writer, quality judges, and automatic revision when issues are found.
                </AlertDescription>
            </Alert>

            <Tabs defaultValue="overview" className="w-full">
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                    <TabsList className="inline-flex w-max md:grid md:grid-cols-5 md:w-full mb-6 md:mb-8">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="agents">Agent Types</TabsTrigger>
                        <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
                        <TabsTrigger value="usage">Using Agentic Mode</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">How Agentic AI Works</h3>
                        <p>
                            Instead of sending one prompt to an AI and getting a response, agentic mode chains multiple 
                            AI "agents" together. Each agent has a specific role and passes its output to the next agent in the pipeline.
                        </p>

                        <div className="border rounded-lg p-4 bg-muted/30 font-mono text-sm space-y-2">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">1</Badge>
                                <span>Summarizer</span>
                                <span className="text-muted-foreground">→ Condenses previous story text</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">2</Badge>
                                <span>Prose Writer</span>
                                <span className="text-muted-foreground">→ Generates new story content</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">3</Badge>
                                <span>Lore Judge</span>
                                <span className="text-muted-foreground">→ Checks for lorebook consistency</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">4</Badge>
                                <span>Prose Writer</span>
                                <span className="text-muted-foreground text-yellow-600">→ Revises if issues found</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        Benefits
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        <li>Higher quality prose through automatic revision</li>
                                        <li>Better lorebook consistency checking</li>
                                        <li>Specialized models for different tasks</li>
                                        <li>Cost-effective (use cheap models for summarization)</li>
                                        <li>Transparent process with diagnostics</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                        Trade-offs
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        <li>Slower than single-prompt generation</li>
                                        <li>Uses more total tokens across agents</li>
                                        <li>More complex to configure initially</li>
                                        <li>Requires understanding of agent roles</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="agents" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Agent Types</h3>
                        <p>
                            Each agent type is specialized for a specific task. You can create custom agents of each type,
                            or use the pre-built system agents.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <BookOpen className="h-4 w-4 text-blue-500" />
                                        Summarizer
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    <p>Condenses long text into a shorter summary while preserving key plot points and character details.</p>
                                    <p className="mt-2"><strong>Best for:</strong> Managing context when stories get long. Use a fast, cheap model.</p>
                                    <p className="mt-1"><strong>Recommended model:</strong> GLM-4-Flash, GPT-4o-mini</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Sparkles className="h-4 w-4 text-purple-500" />
                                        Prose Writer
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    <p>The main content generator. Writes story prose based on scene beat instructions.</p>
                                    <p className="mt-2"><strong>Best for:</strong> Primary story generation. Use your best creative model.</p>
                                    <p className="mt-1"><strong>Recommended model:</strong> DeepSeek Chat, Claude, GPT-4</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Shield className="h-4 w-4 text-orange-500" />
                                        Lore Judge
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    <p>Checks generated prose against your lorebook entries for consistency issues.</p>
                                    <p className="mt-2"><strong>Best for:</strong> Catching character trait violations, world-building errors.</p>
                                    <p className="mt-1"><strong>Output:</strong> Returns "CONSISTENT" or describes "ISSUE" found</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <GitBranch className="h-4 w-4 text-cyan-500" />
                                        Continuity Checker
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    <p>Verifies narrative flow and consistency with previous story events.</p>
                                    <p className="mt-2"><strong>Best for:</strong> Catching plot holes, timeline errors, forgotten details.</p>
                                    <p className="mt-1"><strong>Output:</strong> Returns "CONSISTENT" or describes "ISSUE" found</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Settings className="h-4 w-4 text-gray-500" />
                                        Style Editor
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    <p>Refines prose style, adjusts tone, and improves flow without changing content.</p>
                                    <p className="mt-2"><strong>Best for:</strong> Polishing prose, adjusting writing style, fixing awkward phrasing.</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Zap className="h-4 w-4 text-yellow-500" />
                                        Expander
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    <p>Expands short content into longer, more detailed prose.</p>
                                    <p className="mt-2"><strong>Best for:</strong> Adding description, extending scenes, filling in details.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="pipelines" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Understanding Pipelines</h3>
                        <p>
                            A pipeline defines which agents run in what order, and under what conditions. 
                            The Story Nexus includes several pre-built pipelines, and you can create your own.
                        </p>

                        <h4 className="text-lg font-medium mt-6">Pre-built System Pipelines</h4>
                        
                        <div className="space-y-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Simple Prose Generation</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm">
                                    <p className="text-muted-foreground mb-2">Basic pipeline with just a prose writer. Fast and simple.</p>
                                    <div className="flex gap-2">
                                        <Badge>Prose Writer</Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Quality Prose with Revision</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm">
                                    <p className="text-muted-foreground mb-2">
                                        Full pipeline with lore checking and automatic revision if issues are found.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">Summarizer</Badge>
                                        <span className="text-muted-foreground">→</span>
                                        <Badge>Prose Writer</Badge>
                                        <span className="text-muted-foreground">→</span>
                                        <Badge variant="outline">Lore Judge</Badge>
                                        <span className="text-muted-foreground">→</span>
                                        <Badge variant="secondary">Prose Writer (revision)</Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Long-Form with Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm">
                                    <p className="text-muted-foreground mb-2">
                                        Automatically summarizes context when word count exceeds threshold.
                                    </p>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <Badge variant="outline">Summarizer</Badge>
                                        <span className="text-xs text-muted-foreground">(if &gt;3000 words)</span>
                                        <span className="text-muted-foreground">→</span>
                                        <Badge>Prose Writer</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <h4 className="text-lg font-medium mt-6">Pipeline Conditions</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                            Steps can be conditionally executed based on the pipeline state:
                        </p>
                        
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left p-3 font-medium">Condition</th>
                                        <th className="text-left p-3 font-medium">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    <tr>
                                        <td className="p-3 font-mono text-xs">wordCount &gt; 3000</td>
                                        <td className="p-3 text-muted-foreground">Only runs if previous text exceeds word count</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-mono text-xs">anyJudgeFoundIssues</td>
                                        <td className="p-3 text-muted-foreground">Runs if any judge agent found issues</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-mono text-xs">roleOutputContains:lore_judge:ISSUE</td>
                                        <td className="p-3 text-muted-foreground">Runs if specific agent's output contains text</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-mono text-xs">hasLorebookEntries</td>
                                        <td className="p-3 text-muted-foreground">Runs if lorebook entries are available</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="usage" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Using Agentic Mode in Scene Beats</h3>
                        
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                                <div>
                                    <h4 className="font-medium">Enable Agentic Mode</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        In the scene beat editor, toggle on "Agentic Mode" using the switch at the bottom. 
                                        This will reveal pipeline selection options.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
                                <div>
                                    <h4 className="font-medium">Select a Pipeline</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Choose from available pipelines in the dropdown. Start with "Simple Prose Generation" 
                                        to test, then try "Quality Prose with Revision" for full quality checking.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
                                <div>
                                    <h4 className="font-medium">Write Your Scene Beat</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Enter your scene instructions as normal. The pipeline will use this as the primary input
                                        along with your lorebook entries and previous text.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>
                                <div>
                                    <h4 className="font-medium">Generate with Pipeline</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Click "Generate with Pipeline". You'll see a progress indicator showing which agent 
                                        is currently running. Streamed output appears as it's generated.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">5</div>
                                <div>
                                    <h4 className="font-medium flex items-center gap-2">
                                        Review with Diagnostics
                                        <Stethoscope className="h-4 w-4" />
                                    </h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        After generation completes, click the "Diagnose" button to see what each agent did. 
                                        This shows the exact prompts sent and responses received — invaluable for debugging
                                        and understanding the pipeline's decisions.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Alert className="mt-6">
                            <Clock className="h-4 w-4" />
                            <AlertTitle>Timing Expectations</AlertTitle>
                            <AlertDescription>
                                Agentic pipelines take longer than single-prompt generation. A 4-step pipeline might take 
                                30-60 seconds depending on models used. The quality improvement is often worth the wait.
                            </AlertDescription>
                        </Alert>
                    </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Creating Custom Pipelines</h3>
                        <p>
                            Navigate to <strong>Agents</strong> in the sidebar to create custom agents and pipelines.
                        </p>

                        <h4 className="text-lg font-medium mt-6">Tips for Custom Pipelines</h4>
                        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                            <li><strong>Start simple:</strong> Begin with 2-3 agents and add complexity gradually</li>
                            <li><strong>Use cheap models for utility:</strong> Summarizers and judges don't need expensive models</li>
                            <li><strong>Enable streaming on final step:</strong> Let users see the prose as it generates</li>
                            <li><strong>Mark revision steps:</strong> Use "Is Revision Step" so the agent gets proper context</li>
                            <li><strong>Use anyJudgeFoundIssues:</strong> Simplest way to trigger revision after multiple judges</li>
                        </ul>

                        <h4 className="text-lg font-medium mt-6">Revision Steps</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                            When a step is marked as a "revision step", the prose writer receives:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                            <li>The original generated prose</li>
                            <li>All feedback from judge agents</li>
                            <li>Instructions to rewrite addressing the issues</li>
                        </ul>

                        <h4 className="text-lg font-medium mt-6">Model Selection Strategy</h4>
                        <div className="border rounded-lg overflow-hidden mt-4">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left p-3 font-medium">Agent Role</th>
                                        <th className="text-left p-3 font-medium">Model Priority</th>
                                        <th className="text-left p-3 font-medium">Why</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    <tr>
                                        <td className="p-3">Summarizer</td>
                                        <td className="p-3">Fast & Cheap</td>
                                        <td className="p-3 text-muted-foreground">Simple task, runs often</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3">Prose Writer</td>
                                        <td className="p-3">Best Quality</td>
                                        <td className="p-3 text-muted-foreground">Main creative output</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3">Judges/Checkers</td>
                                        <td className="p-3">Mid-tier</td>
                                        <td className="p-3 text-muted-foreground">Needs reasoning but not creativity</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3">Style Editor</td>
                                        <td className="p-3">Quality</td>
                                        <td className="p-3 text-muted-foreground">Final polish matters</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <Alert className="mt-6">
                            <RefreshCw className="h-4 w-4" />
                            <AlertTitle>Iteration is Key</AlertTitle>
                            <AlertDescription>
                                Use the Diagnostics view to understand what's happening in your pipeline. 
                                If a judge is too strict or too lenient, adjust its system prompt. 
                                If revisions aren't improving quality, check what feedback is being passed.
                            </AlertDescription>
                        </Alert>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
