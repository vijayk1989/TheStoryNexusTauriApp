import { Link } from "react-router";
import {
    BookOpen,
    Tag,
    Users,
    MapPin,
    Package,
    Calendar,
    StickyNote,
    FileText,
    PlayCircle,
    Clock,
    Search,
    Filter,
    Eye,
    EyeOff,
    Plus,
    Edit,
    Trash2,
    ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LorebookGuide() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-4">Lorebook Guide</h2>
                <p className="text-muted-foreground mb-6">
                    Learn how to use the Lorebook feature to organize and manage your story's world, characters, and other elements.
                </p>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid grid-cols-4 mb-8">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="creating">Creating Entries</TabsTrigger>
                    <TabsTrigger value="managing">Managing Entries</TabsTrigger>
                    <TabsTrigger value="integration">Integration with Writing</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">What is a Lorebook?</h3>
                        <p>
                            A Lorebook is a powerful organizational tool that helps you keep track of all the important elements in your story's world. It serves as a central repository for characters, locations, items, events, and other story elements.
                        </p>
                        <p>
                            The Lorebook in The Story Nexus is designed to not only help you organize your story elements but also to integrate them seamlessly with the AI writing process.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                        Key Benefits
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Organize all your story elements in one place</li>
                                        <li>Maintain consistency throughout your story</li>
                                        <li>Automatically provide context to the AI</li>
                                        <li>Track relationships between story elements</li>
                                        <li>Filter and search for specific information</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Tag className="h-5 w-5 text-primary" />
                                        Tag-Based System
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p>
                                        The Lorebook uses a tag-based system to connect your writing with your Lorebook entries. When you write text that contains tags matching your Lorebook entries, those entries are automatically identified and can be used to provide context to the AI.
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        For example, if you have a character named "Harry Potter" and you mention "Harry" in your text, the system will recognize and match this entry.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Entry Categories</h3>
                        <p>
                            The Lorebook supports various categories of entries to help you organize different types of story elements:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="h-5 w-5 text-primary" />
                                    <h4 className="font-medium">Characters</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    People, beings, or entities with agency in your story
                                </p>
                            </div>

                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="h-5 w-5 text-primary" />
                                    <h4 className="font-medium">Locations</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Places, settings, or environments where your story takes place
                                </p>
                            </div>

                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <Package className="h-5 w-5 text-primary" />
                                    <h4 className="font-medium">Items</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Objects, artifacts, or possessions of significance
                                </p>
                            </div>

                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-5 w-5 text-primary" />
                                    <h4 className="font-medium">Events</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Occurrences, happenings, or incidents in your story
                                </p>
                            </div>

                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <StickyNote className="h-5 w-5 text-primary" />
                                    <h4 className="font-medium">Notes</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    General information, ideas, or concepts
                                </p>
                            </div>

                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <h4 className="font-medium">Synopsis</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Summary or overview of your story or chapters
                                </p>
                            </div>

                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <PlayCircle className="h-5 w-5 text-primary" />
                                    <h4 className="font-medium">Starting Scenario</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Initial situation or setup for your story
                                </p>
                            </div>

                            <div className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-5 w-5 text-primary" />
                                    <h4 className="font-medium">Timeline</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Chronological sequence of events or history
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-6">
                        <Link to="/dashboard/:storyId/lorebook">
                            <Button className="gap-2">
                                Open Lorebook
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </TabsContent>

                <TabsContent value="creating" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Creating Lorebook Entries</h3>
                        <p>
                            Creating detailed Lorebook entries is essential for building a rich story world and providing the AI with the context it needs to generate appropriate content.
                        </p>

                        <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                            <h4 className="text-lg font-medium">Step 1: Access the Lorebook</h4>
                            <p>
                                Navigate to your story dashboard and click on the "Lorebook" tab in the navigation menu.
                            </p>
                            <div className="flex items-center gap-2 my-2">
                                <BookOpen className="h-5 w-5 text-primary" />
                                <span className="text-sm text-muted-foreground">
                                    Path: Dashboard → [Your Story] → Lorebook
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                            <h4 className="text-lg font-medium">Step 2: Create a New Entry</h4>
                            <p>
                                Click the "New Entry" button in the top-right corner of the Lorebook page.
                            </p>
                            <div className="flex items-center gap-2 my-2">
                                <Plus className="h-5 w-5 text-primary" />
                                <span className="text-sm text-muted-foreground">
                                    This will open the Create Entry dialog
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                            <h4 className="text-lg font-medium">Step 3: Fill in the Basic Information</h4>
                            <div className="space-y-2">
                                <p>
                                    Complete the following fields in the dialog:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li>
                                        <strong>Name:</strong> The name of your entry (e.g., "Harry Potter")
                                        <p className="text-sm text-muted-foreground ml-6">
                                            This will automatically be used as a tag for matching in your text
                                        </p>
                                    </li>
                                    <li>
                                        <strong>Category:</strong> Select the appropriate category for your entry
                                        <p className="text-sm text-muted-foreground ml-6">
                                            Choose from character, location, item, event, note, synopsis, starting scenario, or timeline
                                        </p>
                                    </li>
                                    <li>
                                        <strong>Importance:</strong> Set the importance level of this entry
                                        <p className="text-sm text-muted-foreground ml-6">
                                            Options include major, minor, or background
                                        </p>
                                    </li>
                                    <li>
                                        <strong>Tags:</strong> Add additional tags for this entry
                                        <p className="text-sm text-muted-foreground ml-6">
                                            Enter tags separated by commas (e.g., "The Boy Who Lived, Gryffindor, Wizard")
                                        </p>
                                    </li>
                                    <li>
                                        <strong>Description:</strong> Write a detailed description of this entry
                                        <p className="text-sm text-muted-foreground ml-6">
                                            This is the main content that will be provided to the AI when this entry is matched
                                        </p>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                            <h4 className="text-lg font-medium">Step 4: Advanced Settings (Optional)</h4>
                            <p>
                                Click on "Advanced Settings" to access additional options:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>
                                    <strong>Type:</strong> Specify a more specific type within the category
                                    <p className="text-sm text-muted-foreground ml-6">
                                        Examples: Protagonist, Villain, Capital City, Magical Artifact
                                    </p>
                                </li>
                                <li>
                                    <strong>Status:</strong> Set the current status of this entry
                                    <p className="text-sm text-muted-foreground ml-6">
                                        Options include active, inactive, or historical
                                    </p>
                                </li>
                                <li>
                                    <strong>Disable Entry:</strong> Toggle to disable this entry
                                    <p className="text-sm text-muted-foreground ml-6">
                                        Disabled entries won't be matched in text or included in AI context
                                    </p>
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-4 border-l-4 border-primary pl-4 py-2">
                            <h4 className="text-lg font-medium">Step 5: Save Your Entry</h4>
                            <p>
                                Click the "Create" button to save your new Lorebook entry.
                            </p>
                            <Alert className="mt-4 bg-primary/10 border-primary">
                                <AlertTitle>Pro Tip</AlertTitle>
                                <AlertDescription>
                                    Create entries for all major characters, locations, and important story elements before you start writing. This will ensure the AI has a good understanding of your story world from the beginning.
                                </AlertDescription>
                            </Alert>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="managing" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Managing Your Lorebook</h3>
                        <p>
                            The Lorebook provides powerful tools for organizing, filtering, and managing your story elements.
                        </p>

                        <div className="space-y-4">
                            <h4 className="text-lg font-medium">Filtering and Sorting</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Category Filters</h5>
                                    </div>
                                    <p className="text-sm">
                                        Use the tabs at the top of the Lorebook page to filter entries by category:
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <Badge variant="outline">All</Badge>
                                        <Badge variant="outline">Characters</Badge>
                                        <Badge variant="outline">Locations</Badge>
                                        <Badge variant="outline">Items</Badge>
                                        <Badge variant="outline">Events</Badge>
                                        <Badge variant="outline">Notes</Badge>
                                        <Badge variant="outline">Synopsis</Badge>
                                        <Badge variant="outline">Starting Scenario</Badge>
                                        <Badge variant="outline">Timeline</Badge>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Search className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Search and Sort</h5>
                                    </div>
                                    <p className="text-sm">
                                        Use the search bar to find specific entries by name, description, or tags.
                                    </p>
                                    <p className="text-sm mt-2">
                                        Sort your entries by:
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <Badge variant="outline">Name</Badge>
                                        <Badge variant="outline">Category</Badge>
                                        <Badge variant="outline">Importance</Badge>
                                        <Badge variant="outline">Created Date</Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 mt-6">
                            <h4 className="text-lg font-medium">Editing and Deleting Entries</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Edit className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Editing Entries</h5>
                                    </div>
                                    <p className="text-sm">
                                        To edit an entry, click the edit icon on the entry card. This will open the same dialog used for creation, but with the current values pre-filled.
                                    </p>
                                    <p className="text-sm mt-2">
                                        Make your changes and click "Update" to save them.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Trash2 className="h-5 w-5 text-primary" />
                                        <h5 className="font-medium">Deleting Entries</h5>
                                    </div>
                                    <p className="text-sm">
                                        To delete an entry, click the trash icon on the entry card. You will be asked to confirm the deletion.
                                    </p>
                                    <Alert className="mt-2 bg-destructive/10 border-destructive">
                                        <AlertTitle>Warning</AlertTitle>
                                        <AlertDescription>
                                            Deletion is permanent and cannot be undone.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 mt-6">
                            <h4 className="text-lg font-medium">Enabling and Disabling Entries</h4>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Eye className="h-5 w-5 text-primary" />
                                    <EyeOff className="h-5 w-5 text-muted-foreground" />
                                    <h5 className="font-medium">Toggle Visibility</h5>
                                </div>
                                <p className="text-sm">
                                    Instead of deleting entries, you can disable them temporarily. This is useful when you want to exclude certain entries from being matched or included in AI context without losing the information.
                                </p>
                                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                                    <li>Click the eye icon on an entry card to toggle its enabled/disabled state</li>
                                    <li>Disabled entries appear faded and have a "Disabled" badge</li>
                                    <li>Use the "Show Disabled" toggle to view or hide disabled entries in the list</li>
                                </ul>
                            </div>
                        </div>

                        <Alert className="mt-6">
                            <AlertTitle>Best Practices</AlertTitle>
                            <AlertDescription>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Regularly review and update your Lorebook entries as your story evolves</li>
                                    <li>Use consistent naming conventions for related entries</li>
                                    <li>Keep descriptions concise but informative</li>
                                    <li>Use tags strategically to ensure proper matching</li>
                                    <li>Disable entries temporarily rather than deleting them if you're unsure</li>
                                </ul>
                            </AlertDescription>
                        </Alert>
                    </div>
                </TabsContent>

                <TabsContent value="integration" className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Integration with Writing</h3>
                        <p>
                            The true power of the Lorebook comes from how it integrates with your writing process and the AI generation.
                        </p>

                        <div className="space-y-4">
                            <h4 className="text-lg font-medium">Automatic Tag Matching</h4>
                            <p>
                                As you write, The Story Nexus automatically scans your text for matches with your Lorebook entries' tags.
                            </p>
                            <div className="bg-muted p-4 rounded-md">
                                <h5 className="font-medium mb-2">How Tag Matching Works:</h5>
                                <ol className="list-decimal list-inside space-y-2 ml-4">
                                    <li>
                                        Each Lorebook entry has tags (including its name)
                                        <p className="text-sm text-muted-foreground ml-6">
                                            Example: A character named "Harry Potter" might have tags like "Harry Potter", "The Boy Who Lived", "Gryffindor Seeker"
                                        </p>
                                    </li>
                                    <li>
                                        When you write text that contains any of these tags, the system identifies a match
                                        <p className="text-sm text-muted-foreground ml-6">
                                            Example: Writing "Harry walked into the room" would match the "Harry Potter" entry
                                        </p>
                                    </li>
                                    <li>
                                        Matched entries are collected and can be viewed in the editor sidebar
                                        <p className="text-sm text-muted-foreground ml-6">
                                            Click on "Matched Tags" in the editor to see which Lorebook entries have been matched in your current chapter
                                        </p>
                                    </li>
                                </ol>
                            </div>
                        </div>

                        <div className="space-y-4 mt-6">
                            <h4 className="text-lg font-medium">AI Context Integration</h4>
                            <p>
                                When you use AI generation features like Scene Beats, matched Lorebook entries provide context to the AI.
                            </p>
                            <div className="bg-muted p-4 rounded-md">
                                <h5 className="font-medium mb-2">How AI Integration Works:</h5>
                                <ol className="list-decimal list-inside space-y-2 ml-4">
                                    <li>
                                        When you create a Scene Beat, the system identifies which Lorebook entries are relevant
                                        <p className="text-sm text-muted-foreground ml-6">
                                            This includes entries matched in your current chapter and potentially in your Scene Beat command
                                        </p>
                                    </li>
                                    <li>
                                        The descriptions from these entries are included in the context sent to the AI
                                        <p className="text-sm text-muted-foreground ml-6">
                                            This helps the AI understand your characters, locations, and other story elements
                                        </p>
                                    </li>
                                    <li>
                                        The AI uses this context to generate more accurate and consistent content
                                        <p className="text-sm text-muted-foreground ml-6">
                                            For example, it will know character personalities, location details, and important story facts
                                        </p>
                                    </li>
                                </ol>
                            </div>

                            <Alert className="mt-4 bg-primary/10 border-primary">
                                <AlertTitle>Pro Tip</AlertTitle>
                                <AlertDescription>
                                    For best results, create detailed Lorebook entries for all major story elements and make sure to mention them by name in your writing to ensure they're matched and included in the AI context.
                                </AlertDescription>
                            </Alert>
                        </div>

                        <div className="space-y-4 mt-6">
                            <h4 className="text-lg font-medium">Viewing Matched Entries</h4>
                            <p>
                                While writing, you can view which Lorebook entries have been matched in your current chapter.
                            </p>
                            <ol className="list-decimal list-inside space-y-2 ml-4">
                                <li>
                                    In the chapter editor, click on "Matched Tags" in the right sidebar
                                    <p className="text-sm text-muted-foreground ml-6">
                                        This will open a drawer showing all Lorebook entries that match text in your current chapter
                                    </p>
                                </li>
                                <li>
                                    Review the matched entries to ensure the right context is being provided to the AI
                                    <p className="text-sm text-muted-foreground ml-6">
                                        If important entries are missing, make sure to mention them by name in your text
                                    </p>
                                </li>
                            </ol>
                        </div>

                        <div className="mt-8 p-6 border rounded-lg bg-muted/30">
                            <h3 className="text-xl font-semibold mb-4">Advanced Lorebook Strategies</h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium">Strategic Tagging</h4>
                                    <p className="text-sm">
                                        Create tags that are likely to appear naturally in your writing. Include variations, nicknames, and common references.
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-medium">Hierarchical Organization</h4>
                                    <p className="text-sm">
                                        Use the importance levels (major, minor, background) to create a hierarchy of entries. This helps prioritize which information is most critical for the AI.
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-medium">Consistent Descriptions</h4>
                                    <p className="text-sm">
                                        Write descriptions in a consistent style and format across entries. Focus on information that's relevant for the AI to know when generating content.
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-medium">Regular Maintenance</h4>
                                    <p className="text-sm">
                                        As your story evolves, regularly update your Lorebook entries to reflect character development, changing relationships, and new story elements.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
} 