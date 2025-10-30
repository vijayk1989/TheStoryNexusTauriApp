import { Link } from "react-router";
import { ExternalLink, Bot, BookOpen, PenLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { API_URLS } from "@/constants/urls";

export default function BasicsGuide() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-4">The Absolute Basics</h2>
                <p className="text-muted-foreground mb-6">
                    Welcome to The Story Nexus! This guide will walk you through the essential steps to get started with your AI-powered writing journey.
                </p>
            </div>

            <div className="space-y-6">
                <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center">1</span>
                        Set Up Your AI Connection
                    </h3>
                    <p>
                        Before you can use AI features, you'll need to connect to an AI provider. The Story Nexus supports OpenAI, OpenRouter, or a local AI model.
                    </p>
                    <div className="flex items-center gap-2 my-2">
                        <Bot className="h-5 w-5 text-primary" />
                        <Link to="/ai-settings">
                            <Button variant="outline" className="gap-1">
                                Go to AI Settings
                                <ExternalLink className="h-3 w-3" />
                            </Button>
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="border rounded-lg p-4 bg-card">
                            <h4 className="font-medium mb-2">OpenRouter</h4>
                            <p className="text-sm text-muted-foreground">
                                Enter your OpenRouter API key to access a variety of models from different providers.
                            </p>
                        </div>
                        <div className="border rounded-lg p-4 bg-card">
                            <h4 className="font-medium mb-2">OpenAI</h4>
                            <p className="text-sm text-muted-foreground">
                                Enter your OpenAI API key to access models like GPT-4 and GPT-3.5.
                            </p>
                        </div>
                        <div className="border rounded-lg p-4 bg-card">
                            <h4 className="font-medium mb-2">Local</h4>
                            <p className="text-sm text-muted-foreground">
                                Connect to a locally hosted model by entering the API URL (default: {API_URLS.LOCAL_AI_DEFAULT}).
                            </p>
                        </div>
                    </div>
                    <Alert>
                        <AlertTitle>Important</AlertTitle>
                        <AlertDescription>
                            After adding your API key, available models will be automatically retrieved. For local models, you'll need to click the "Refresh Models" button.
                        </AlertDescription>
                    </Alert>
                </div>

                <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center">2</span>
                        Create Your First Story
                    </h3>
                    <p>
                        Once your AI connection is set up, you can create your first story.
                    </p>
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                        <li>Go to the <strong>Home</strong> page and click on <strong>Stories</strong></li>
                        <li>Click the <strong>Create New Story</strong> button</li>
                        <li>Enter a title, author name, and optional synopsis</li>
                        <li>Click <strong>Create</strong> to save your new story</li>
                        <li>Click on the story card to access your story dashboard</li>
                    </ol>
                    <div className="flex items-center gap-2 my-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <Link to="/stories">
                            <Button variant="outline" className="gap-1">
                                Go to Stories
                                <ExternalLink className="h-3 w-3" />
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center">3</span>
                        Create Your First Chapter
                    </h3>
                    <p>
                        Now that you have a story, it's time to create your first chapter.
                    </p>
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                        <li>From your story dashboard, click <strong>Create New Chapter</strong></li>
                        <li>Enter a title for your chapter</li>
                        <li>Optionally, set a POV (Point of View) character and type</li>
                        <li>Click <strong>Create</strong> to save your new chapter</li>
                        <li>Click the <strong>Write</strong> button on the chapter card to open the editor</li>
                    </ol>
                    <div className="flex items-center gap-2 my-2">
                        <PenLine className="h-5 w-5 text-primary" />
                    </div>
                </div>

                <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center">4</span>
                        Write with AI Assistance
                    </h3>
                    <p>
                        The Story Nexus editor allows you to write manually or with AI assistance through Scene Beats.
                    </p>
                    <div className="bg-muted p-4 rounded-md">
                        <h4 className="font-medium mb-2">Using Scene Beats</h4>
                        <p className="mb-2">Scene Beats are commands you give to the AI to generate content based on your instructions.</p>
                        <ol className="list-decimal list-inside space-y-2 ml-4">
                            <li>
                                Press <kbd className="px-2 py-1 bg-background rounded border">Alt + S</kbd> (Windows) or <kbd className="px-2 py-1 bg-background rounded border">Option + S</kbd> (Mac) to insert a Scene Beat
                                <br />
                                <span className="text-sm text-muted-foreground">Alternatively, click on the menu and select Insert → Scene Beat</span>
                            </li>
                            <li>Enter your command describing what you want the AI to write</li>
                            <li>Select a prompt template and AI model from the dropdown menus</li>
                            <li>Click <strong>Generate Prose</strong> to create content</li>
                            <li>Review the generated content and click <strong>Accept</strong> to insert it into your story, or <strong>Reject</strong> to try again</li>
                        </ol>
                    </div>
                    <div className="flex items-center gap-2 my-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <Alert className="bg-primary/10 border-primary">
                        <AlertTitle>Pro Tip</AlertTitle>
                        <AlertDescription>
                            Be specific in your Scene Beat commands. Instead of "continue the story," try something like "describe the character's reaction to the surprising news, showing their inner conflict."
                        </AlertDescription>
                    </Alert>
                </div>

                <div className="mt-8 p-6 border rounded-lg bg-muted/30">
                    <h3 className="text-xl font-semibold mb-4">What's Next?</h3>
                    <p className="mb-4">
                        These are just the basics to get you started. The Story Nexus offers many more advanced features to enhance your writing experience:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                        <li>Create a <strong>Lorebook</strong> to manage characters, locations, and other story elements</li>
                        <li>Customize <strong>Prompts</strong> to tailor the AI's writing style and behavior</li>
                        <li>Use <strong>Brainstorming</strong> tools to develop ideas and overcome writer's block</li>
                        <li>Export your stories in different formats</li>
                    </ul>
                    <p className="mt-4">
                        Explore the other guides to learn more about these advanced features.
                    </p>
                </div>
            </div>
        </div>
    );
} 