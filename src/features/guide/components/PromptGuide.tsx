import {
    MessageSquare,
    BookOpen,
    Zap,
    Sparkles,
    CheckCircle,
    Settings,
    FileText,
    Code,
    Table,
    Sliders,
    PenTool,
    Layers,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PromptGuide() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-4">Prompt Guide</h2>
                <p className="text-muted-foreground mb-6">
                    Creating effective prompts is essential for getting the best results from AI generation in your story. This guide will help you understand how to create, customize,
                    and use prompts effectively in The Story Nexus. There are 6 system prompts automatically created for you, they cannot be deleted or edited but can be cloned.
                </p>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid grid-cols-4 mb-8">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="creating">Creating Prompts</TabsTrigger>
                    <TabsTrigger value="variables">Using Variables</TabsTrigger>
                    <TabsTrigger value="managing">Managing Prompts</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">What are Prompts?</h3>
                        <p>
                            Prompts are structured instructions that tell the AI how to generate content for your story. They consist of a series of messages with different roles (system, user, assistant) that provide context and direction to the AI model.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-primary" />
                                        Key Benefits
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Consistent Writing Style: Create prompts that maintain a consistent tone and style throughout your story</li>
                                        <li>Specialized Generation: Tailor prompts for specific tasks like scene beats, summaries, or brainstorming</li>
                                        <li>Customizable Parameters: Adjust temperature and token settings to control creativity and length</li>
                                        <li>Model Selection: Choose which AI models can use each prompt for optimal results</li>
                                        <li>Variable System: Use dynamic variables to automatically include story context</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-primary" />
                                        Prompt Structure
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p>
                                        Prompts consist of a series of messages with different roles:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li><strong>System Messages:</strong> Instructions that set the overall behavior of the AI</li>
                                        <li><strong>User Messages:</strong> Represent what the user (you) is asking the AI to do</li>
                                        <li><strong>Assistant Messages:</strong> Examples of how the AI should respond</li>
                                    </ul>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        This structure allows for precise control over the AI's output, ensuring it matches your creative vision.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Prompt Types</h3>
                        <p>
                            The Story Nexus supports various types of prompts to help you with different aspects of your writing process:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <PenTool className="h-5 w-5 text-primary" />
                                    <h4 className="font-medium">Scene Beat</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    For generating story content based on a scene description
                                </p>
                            </div>

                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <h4 className="font-medium">Generate Summary</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    For creating summaries of chapters or sections
                                </p>
                            </div>

                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <Code className="h-5 w-5 text-primary" />
                                    <h4 className="font-medium">Selection-Specific</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    For working with selected text in your document
                                </p>
                            </div>

                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <Layers className="h-5 w-5 text-primary" />
                                    <h4 className="font-medium">Continue Writing</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    For extending the current text naturally
                                </p>
                            </div>

                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                    <h4 className="font-medium">Brainstorm</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    For idea generation and creative exploration
                                </p>
                            </div>

                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <Settings className="h-5 w-5 text-primary" />
                                    <h4 className="font-medium">Other</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    For custom use cases and specialized needs
                                </p>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="creating" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Creating Effective Prompts</h3>
                        <p>
                            Creating well-crafted prompts is the key to getting high-quality AI-generated content that matches your vision.
                        </p>

                        <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                            <h4 className="text-lg font-medium">Step 1: Access the Prompts Section</h4>
                            <p>
                                Open the chapter editor and click <strong>Prompts</strong> in the right tool rail.
                            </p>
                            <div className="flex items-center gap-2 my-2">
                                <MessageSquare className="h-5 w-5 text-primary" />
                                <span className="text-sm text-muted-foreground">
                                    Path: Editor &gt; right tool rail &gt; Prompts
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                            <h4 className="text-lg font-medium">Step 2: Create a New Prompt</h4>
                            <p>
                                Click the "New Prompt" button to open the prompt creation form.
                            </p>
                        </div>

                        <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                            <h4 className="text-lg font-medium">Step 3: Basic Information</h4>
                            <div className="space-y-2">
                                <p>
                                    Fill in the basic information for your prompt:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li>
                                        <strong>Name:</strong> Give your prompt a descriptive name
                                        <p className="text-sm text-muted-foreground ml-6">
                                            Examples: "Descriptive Scene Beat", "Character Dialog Generator"
                                        </p>
                                    </li>
                                    <li>
                                        <strong>Prompt Type:</strong> Select the appropriate type for your prompt
                                        <p className="text-sm text-muted-foreground ml-6">
                                            Choose from Scene Beat, Generate Summary, Selection-Specific, Continue Writing, Brainstorm, or Other
                                        </p>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                            <h4 className="text-lg font-medium">Step 4: Create Messages</h4>
                            <p>
                                Prompts consist of a series of messages with different roles:
                            </p>
                            <div className="space-y-4 mt-4">
                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Settings className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">System Messages</h5>
                                    </div>
                                    <p className="text-sm">
                                        Instructions that set the overall behavior of the AI
                                    </p>
                                    <div className="bg-muted p-3 rounded mt-2 text-sm">
                                        <p className="font-mono">
                                            "You are a skilled fantasy writer with a descriptive style. Focus on sensory details and atmosphere."
                                        </p>
                                    </div>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">User Messages</h5>
                                    </div>
                                    <p className="text-sm">
                                        Represent what the user (you) is asking the AI to do
                                    </p>
                                    <div className="bg-muted p-3 rounded mt-2 text-sm">
                                        <p className="font-mono">
                                            "Write a scene where x character enters y location for the first time."
                                        </p>
                                    </div>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Assistant Messages</h5>
                                    </div>
                                    <p className="text-sm">
                                        Examples of how the AI should respond
                                    </p>
                                    <div className="bg-muted p-3 rounded mt-2 text-sm">
                                        <p className="font-mono">
                                            "Here's a vivid description of the character entering the location, focusing on their emotional reaction and the sensory details..."
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4">
                                <h5 className="font-medium">Adding Messages</h5>
                                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                                    <li>Click the "System", "User", or "Assistant" buttons to add messages of each type</li>
                                    <li>Use the up/down arrows to change message order</li>
                                    <li>Use the trash icon to delete messages</li>
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                            <h4 className="text-lg font-medium">Step 5: Select AI Models</h4>
                            <p>
                                Choose which AI models can use this prompt:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                                <li>Click the model dropdown to see available models grouped by provider</li>
                                <li>Choose <strong>Local default</strong> to use the default model configured for your local runtime, or choose a specific local model when several are available</li>
                                <li>Select models that work well for your prompt's purpose</li>
                                <li>Selected models appear as badges above the dropdown</li>
                                <li>Click the X on a badge to remove a model</li>
                            </ul>
                        </div>

                        <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                            <h4 className="text-lg font-medium">Step 6: Configure Advanced Settings</h4>
                            <p>
                                Adjust parameters to fine-tune the AI's behavior:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sliders className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Temperature</h5>
                                    </div>
                                    <p className="text-sm">
                                        Controls randomness and creativity
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 ml-4 text-sm text-muted-foreground mt-2">
                                        <li>Lower values (0.1-0.5): More focused, predictable outputs</li>
                                        <li>Medium values (0.6-1.0): Balanced creativity and coherence</li>
                                        <li>Higher values (1.1-2.0): More creative, potentially less coherent</li>
                                    </ul>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Table className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Max Tokens</h5>
                                    </div>
                                    <p className="text-sm">
                                        Sets the maximum length of the generated text
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 ml-4 text-sm text-muted-foreground mt-2">
                                        <li>Higher values allow for longer generations</li>
                                        <li>Consider the context length limitations of your chosen models</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                            <h4 className="text-lg font-medium">Step 7: Save Your Prompt</h4>
                            <p>
                                Click "Create Prompt" to save your new prompt or "Update Prompt" if editing an existing one.
                            </p>
                            <Alert className="mt-4 bg-primary/10 border-primary">
                                <AlertTitle>Pro Tip</AlertTitle>
                                <AlertDescription>
                                    Start with a simple prompt and test it with different AI models. Then refine it based on the results to get exactly the style and content you want.
                                </AlertDescription>
                            </Alert>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="variables" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Using Variables</h3>
                        <p>
                            Variables are placeholders in your prompts that get replaced with actual content when the prompt is used. They make your prompts dynamic and context-aware.
                        </p>

                        <div className="space-y-4">
                            <h4 className="text-lg font-medium">Available Variables</h4>
                            <p>
                                These variables are replaced when the prompt runs. Some are only populated in the flows that provide that context, such as Scene Beat or Brainstorm.
                            </p>
                            <div className="overflow-x-auto mt-4">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-muted">
                                            <th className="border p-2 text-left">Variable</th>
                                            <th className="border p-2 text-left">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;scenebeat&#125;&#125;</td>
                                            <td className="border p-2">The scene beat command you enter</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;scenebeat_context&#125;&#125;</td>
                                            <td className="border p-2">Lorebook context selected for the Scene Beat, including matched chapter entries, matched scene beat entries, or custom context items</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;brainstorm_context&#125;&#125;</td>
                                            <td className="border p-2">Selected chapter summaries, chapter text, and lorebook entries from the Brainstorm context panel</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;matched_entries_chapter&#125;&#125;</td>
                                            <td className="border p-2">Lorebook entries matched against the current chapter. <span className="font-mono text-sm">&#123;&#123;lorebook_chapter_matched_entries&#125;&#125;</span> and <span className="font-mono text-sm">&#123;&#123;lorebook_data&#125;&#125;</span> resolve the same way.</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;lorebook_scenebeat_matched_entries&#125;&#125;</td>
                                            <td className="border p-2">Lorebook entries matched against the current scene beat text</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;lorebook_update_targets&#125;&#125;</td>
                                            <td className="border p-2">Lorebook entries selected as update targets for lorebook update prompts</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;lorebook Entry Name&#125;&#125;</td>
                                            <td className="border p-2">A specific lorebook entry from any category by name or alias</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;summaries&#125;&#125;</td>
                                            <td className="border p-2">Summaries of all previous chapters. So if you have 3 chapters, it will be the summaries of the previous 2 chapters.</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;all_previous_chapters&#125;&#125;</td>
                                            <td className="border p-2">The full text of every chapter before the current chapter</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;previous_chapter(2)&#125;&#125;</td>
                                            <td className="border p-2">The full text of the previous 2 chapters. Change the number to include more or fewer previous chapters.</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;previous_words(1000)&#125;&#125;</td>
                                            <td className="border p-2">The last 1000 words before the cursor in the editor</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;after_words(500)&#125;&#125;</td>
                                            <td className="border p-2">The next 500 words after the cursor in the editor, when that context is available</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;pov&#125;&#125;</td>
                                            <td className="border p-2">The current point of view character and type</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;chapter_content&#125;&#125;</td>
                                            <td className="border p-2">The full content of the current chapter</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;chapter_outline&#125;&#125;</td>
                                            <td className="border p-2">The outline for the current chapter, when one exists</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;chapter_data(2)&#125;&#125;</td>
                                            <td className="border p-2">The full text for a specific chapter by chapter number. Change the number to select a different chapter.</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;selected_text&#125;&#125;</td>
                                            <td className="border p-2">Text currently selected in the editor. <span className="font-mono text-sm">&#123;&#123;selection&#125;&#125;</span> resolves the same way.</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;story_language&#125;&#125;</td>
                                            <td className="border p-2">The language of the story</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;timeline&#125;&#125;</td>
                                            <td className="border p-2">Timeline events up to the current chapter. <span className="font-mono text-sm">&#123;&#123;timeline_up_to_current_chapter&#125;&#125;</span> and <span className="font-mono text-sm">&#123;&#123;all_timelines&#125;&#125;</span> resolve the same way.</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;timeline_current_chapter&#125;&#125;</td>
                                            <td className="border p-2">Only timeline events attached to the current chapter</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;all_entries&#125;&#125;</td>
                                            <td className="border p-2">All enabled lorebook entries for the story</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;all_characters&#125;&#125;</td>
                                            <td className="border p-2">All character entries from the Lorebook</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;all_locations&#125;&#125;</td>
                                            <td className="border p-2">All location entries from the Lorebook</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;all_items&#125;&#125;</td>
                                            <td className="border p-2">All item entries from the Lorebook</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;all_events&#125;&#125;</td>
                                            <td className="border p-2">All event entries from the Lorebook</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;all_notes&#125;&#125;</td>
                                            <td className="border p-2">All note entries from the Lorebook</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;all_synopsis&#125;&#125;</td>
                                            <td className="border p-2">All synopsis entries from the Lorebook</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;all_starting_scenarios&#125;&#125;</td>
                                            <td className="border p-2">All starting scenario entries from the Lorebook</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;character Alias&#125;&#125;</td>
                                            <td className="border p-2">A specific character entry by name or alias</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;user_input&#125;&#125;</td>
                                            <td className="border p-2">Specifically for brainstorm section, adds user_input to resolved prompt</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;chat_history&#125;&#125;</td>
                                            <td className="border p-2">Specifically for brainstorm section, adds current chat history to resolved prompt</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-4 mt-6">
                            <h4 className="text-lg font-medium">Using Variables in Messages</h4>
                            <p>
                                Variables can be used in any message type (system, user, or assistant) to create dynamic prompts.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <div className="border rounded-lg p-4 bg-card">
                                    <h5 className="font-medium mb-2">System Message Example</h5>
                                    <div className="bg-muted p-3 rounded text-sm font-mono">
                                        You are a skilled writer working on a story in &#123;&#123;story_language&#125;&#125;. The story is written in &#123;&#123;pov&#125;&#125; perspective. Maintain this perspective and style in your writing.
                                    </div>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <h5 className="font-medium mb-2">User Message Example</h5>
                                    <div className="bg-muted p-3 rounded text-sm font-mono">
                                        Write a scene where &#123;&#123;scenebeat&#125;&#125;. Use the following context from my story: &#123;&#123;previous_words(500)&#125;&#125;
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 mt-6">
                            <h4 className="text-lg font-medium">Context Integration</h4>
                            <p>
                                The prompt parser automatically integrates context from your story:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Lorebook Entries</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Characters, locations, and other elements mentioned in your text
                                    </p>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Chapter Content</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        The text you've already written
                                    </p>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Point of View</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Your current POV character and perspective
                                    </p>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Layers className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Previous Chapters</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Summaries of what came before
                                    </p>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Table className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Timeline</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Ordered events up to the current chapter or from the current chapter only
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm mt-4">
                                This context helps the AI generate content that's consistent with your story world.
                            </p>
                        </div>

                        <Alert className="mt-6">
                            <AlertTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                Example: Prompt and Resolved Text
                            </AlertTitle>
                            <AlertDescription>
                                <p className="mb-2">
                                    Prompt text:
                                </p>
                                <div className="bg-muted p-3 rounded text-sm font-mono mt-2">
                                    Write the next passage in &#123;&#123;story_language&#125;&#125; from &#123;&#123;pov&#125;&#125;. Scene beat: &#123;&#123;scenebeat&#125;&#125;.
                                    <br />
                                    Recent prose: &#123;&#123;previous_words(80)&#125;&#125;
                                    <br />
                                    Current chapter events: &#123;&#123;timeline_current_chapter&#125;&#125;
                                    <br />
                                    Relevant lore: &#123;&#123;scenebeat_context&#125;&#125;
                                </div>
                                <p className="mb-2 mt-4">
                                    Resolved example:
                                </p>
                                <div className="bg-muted p-3 rounded text-sm font-mono mt-2">
                                    Write the next passage in English from Mara Venn, third person limited. Scene beat: Mara confronts Elian at the observatory gate.
                                    <br />
                                    Recent prose: Rain ticked against the brass dome while the city lanterns flickered below the hill.
                                    <br />
                                    Current chapter events: Chapter 2, Event 1: Mara reaches the observatory. Participants: Mara Venn, Elian Cor. Summary: Mara arrives before dawn and finds Elian waiting with the stolen star map.
                                    <br />
                                    Relevant lore: CHARACTER: Mara Venn. Description: A careful cartographer who hides her fear behind precise words.
                                </div>
                            </AlertDescription>
                        </Alert>
                    </div>
                </TabsContent>

                <TabsContent value="managing" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Managing Prompts</h3>
                        <p>
                            Effective prompt management helps you maintain a library of useful prompts for different writing scenarios.
                        </p>

                        <div className="space-y-4">
                            <h4 className="text-lg font-medium">Organizing Prompts</h4>
                            <p>
                                Create different prompts for different writing tasks to build a versatile toolkit:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Description Prompts</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        For vivid settings and environments
                                    </p>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Dialogue Prompts</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        For character conversations and speech
                                    </p>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Action Prompts</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        For dynamic sequences and events
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                                    <li>Name prompts clearly to indicate their purpose</li>
                                    <li>Use the prompt type field to categorize prompts by their intended use</li>
                                    <li>Create genre-specific prompts for different writing styles</li>
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-4 mt-6">
                            <h4 className="text-lg font-medium">Editing Prompts</h4>
                            <p>
                                To edit an existing prompt:
                            </p>
                            <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                                <ol className="list-decimal list-inside space-y-2 ml-4">
                                    <li>
                                        Open <strong>Prompts</strong> from the editor tool rail and select the prompt from the list
                                    </li>
                                    <li>
                                        Make your changes in the prompt form
                                    </li>
                                    <li>
                                        Click "Update Prompt" to save your changes
                                    </li>
                                </ol>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Regularly review and refine your prompts based on the results they produce.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 mt-6">
                            <h4 className="text-lg font-medium">Deleting Prompts</h4>
                            <p>
                                To delete a prompt you no longer need:
                            </p>
                            <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                                <ol className="list-decimal list-inside space-y-2 ml-4">
                                    <li>
                                        Hover over the prompt in the list
                                    </li>
                                    <li>
                                        Click the trash icon that appears
                                    </li>
                                    <li>
                                        Confirm the deletion when prompted
                                    </li>
                                </ol>
                                <Alert className="mt-4 bg-destructive/10 border-destructive">
                                    <AlertTitle>Warning</AlertTitle>
                                    <AlertDescription>
                                        Deletion is permanent and cannot be undone. Consider keeping useful prompts even if you don't use them frequently.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </div>

                        <div className="space-y-4 mt-6">
                            <h4 className="text-lg font-medium">Prompt Integration with Writing</h4>
                            <p>
                                Prompts are integrated with the writing process through the Scene Beat feature and other AI generation tools.
                            </p>
                            <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                                <h5 className="font-medium">Using Prompts with Scene Beats</h5>
                                <ol className="list-decimal list-inside space-y-2 ml-4">
                                    <li>
                                        In the editor, press Alt + S (Windows) or Option + S (Mac) to insert a Scene Beat
                                    </li>
                                    <li>
                                        Enter your scene beat command describing what you want the AI to write
                                    </li>
                                    <li>
                                        Select one of your prompts from the dropdown menu
                                    </li>
                                    <li>
                                        The system will process your prompt, replacing variables with context from your story
                                    </li>
                                    <li>
                                        Click "Generate Prose" to create content based on your prompt
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </TabsContent>

            </Tabs>
        </div>
    );
} 
