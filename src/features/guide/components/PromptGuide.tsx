import {
    MessageSquare,
    BookOpen,
    Zap,
    Sparkles,
    CheckCircle,
    XCircle,
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
                <TabsList className="grid grid-cols-5 mb-8">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="creating">Creating Prompts</TabsTrigger>
                    <TabsTrigger value="variables">Using Variables</TabsTrigger>
                    <TabsTrigger value="managing">Managing Prompts</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced Strategies</TabsTrigger>
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
                                Navigate to your story dashboard and click on the "Prompts" tab in the navigation menu.
                            </p>
                            <div className="flex items-center gap-2 my-2">
                                <MessageSquare className="h-5 w-5 text-primary" />
                                <span className="text-sm text-muted-foreground">
                                    Path: Dashboard → [Your Story] → Prompts
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
                                            "Write a scene where &#123;&#123;character&#125;&#125; enters &#123;&#123;location&#125;&#125; for the first time."
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
                            <h4 className="text-lg font-medium">Common Variables</h4>
                            <p>
                                The Story Nexus provides a variety of variables you can use in your prompts:
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
                                            <td className="border p-2">This will dynamically generate a context based on matched lorebook entries in the chapter or custom context you provide</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;brainstorm_context&#125;&#125;</td>
                                            <td className="border p-2">Dynamic Brainstorm Context</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;summaries&#125;&#125;</td>
                                            <td className="border p-2">Summaries of all previous chapters. So if you have 3 chapters, it will be the summaries of the previous 2 chapters.</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;previous_words(1000)&#125;&#125;</td>
                                            <td className="border p-2">The last 1000 words before the cursor in the editor</td>
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
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;selected_text&#125;&#125;</td>
                                            <td className="border p-2">Text currently selected in the editor</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;story_language&#125;&#125;</td>
                                            <td className="border p-2">The language of the story</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;all_characters&#125;&#125;</td>
                                            <td className="border p-2">All character entries from the Lorebook</td>
                                        </tr>
                                        <tr>
                                            <td className="border p-2 font-mono text-sm">&#123;&#123;all_locations&#125;&#125;</td>
                                            <td className="border p-2">All location entries from the Lorebook</td>
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
                            </div>
                            <p className="text-sm mt-4">
                                This context helps the AI generate content that's consistent with your story world.
                            </p>
                        </div>

                        <Alert className="mt-6">
                            <AlertTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                Advanced Variable Usage
                            </AlertTitle>
                            <AlertDescription>
                                <p className="mb-2">
                                    You can create sophisticated prompts that adapt to your story context by combining variables:
                                </p>
                                <div className="bg-muted p-3 rounded text-sm font-mono mt-2">
                                    Write a scene where &#123;&#123;scenebeat&#125;&#125;. The scene involves the following characters: &#123;&#123;scenebeat_context&#125;&#125;. The scene takes place after these events: &#123;&#123;summaries&#125;&#125;. Maintain the &#123;&#123;pov&#125;&#125; perspective.
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
                                        Select the prompt from the list in the Prompts section
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

                <TabsContent value="advanced" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Advanced Prompt Strategies</h3>
                        <p>
                            Master these advanced techniques to get the most out of your AI-assisted writing.
                        </p>

                        <div className="space-y-4">
                            <h4 className="text-lg font-medium">Creating Specialized Prompts</h4>
                            <p>
                                Develop prompts for specific writing challenges:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Character Voice Prompts</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Create prompts that capture specific character voices and speech patterns
                                    </p>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Description Prompts</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Focus on vivid sensory details for settings and environments
                                    </p>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Action Prompts</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Emphasize clear, dynamic action sequences
                                    </p>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Emotional Prompts</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Highlight internal thoughts and emotional reactions
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 mt-6">
                            <h4 className="text-lg font-medium">Prompt Chaining</h4>
                            <p>
                                Use multiple prompts in sequence for complex writing tasks:
                            </p>
                            <div className="relative overflow-hidden mt-4">
                                <div className="border-l-2 border-primary absolute h-full left-4 top-0"></div>
                                <div className="space-y-6 ml-10">
                                    <div className="relative">
                                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center absolute -left-12">1</div>
                                        <div className="border rounded-lg p-4 bg-card">
                                            <h5 className="font-medium">Brainstorming Prompt</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Use a brainstorming prompt to generate ideas and possibilities
                                            </p>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center absolute -left-12">2</div>
                                        <div className="border rounded-lg p-4 bg-card">
                                            <h5 className="font-medium">Scene Structure Prompt</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Follow with a scene structure prompt to outline the scene
                                            </p>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center absolute -left-12">3</div>
                                        <div className="border rounded-lg p-4 bg-card">
                                            <h5 className="font-medium">Detailed Scene Beat Prompt</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Finish with a detailed scene beat prompt to write the full content
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 mt-6">
                            <h4 className="text-lg font-medium">Troubleshooting Common Issues</h4>
                            <p>
                                If your prompts aren't producing the desired results:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <XCircle className="h-5 w-5 text-destructive" />
                                        <h5 className="font-medium">Too Generic</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Add more specific instructions and examples
                                    </p>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <XCircle className="h-5 w-5 text-destructive" />
                                        <h5 className="font-medium">Inconsistent Style</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Include clear style guidelines in system messages
                                    </p>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <XCircle className="h-5 w-5 text-destructive" />
                                        <h5 className="font-medium">Missing Context</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Make sure you're using the right variables to include story context
                                    </p>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <XCircle className="h-5 w-5 text-destructive" />
                                        <h5 className="font-medium">Too Restrictive</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Increase temperature for more creative variations
                                    </p>
                                </div>

                                <div className="border rounded-lg p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <XCircle className="h-5 w-5 text-destructive" />
                                        <h5 className="font-medium">Too Random</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Decrease temperature for more focused outputs
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 p-6 border rounded-lg bg-muted/30">
                            <h3 className="text-xl font-semibold mb-4">Best Practices</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <ul className="list-disc list-inside space-y-2">
                                        <li>Start Simple: Begin with basic prompts and refine them as you learn what works</li>
                                        <li>Test Different Models: Different AI models respond differently to the same prompt</li>
                                        <li>Include Examples: Provide examples of the style and format you want in assistant messages</li>
                                        <li>Be Specific: Clear, detailed instructions yield better results than vague ones</li>
                                    </ul>
                                </div>
                                <div>
                                    <ul className="list-disc list-inside space-y-2">
                                        <li>Iterate: Refine your prompts based on the results you get</li>
                                        <li>Save Variations: Keep different versions of prompts for different writing needs</li>
                                        <li>Balance Creativity and Control: Find the right temperature setting for your writing style</li>
                                        <li>Use Variables Strategically: Include only the context that's relevant to your current task</li>
                                    </ul>
                                </div>
                            </div>
                            <p className="mt-4 text-muted-foreground">
                                By mastering the art of prompt creation, you'll be able to harness the full power of AI to enhance your storytelling while maintaining your unique voice and vision.
                            </p>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
} 