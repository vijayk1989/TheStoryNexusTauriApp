import { useRef, useState } from "react";
import { AlertTriangle, Download, FileUp, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { siteBackupService } from "@/services/siteBackupService";
import {
    canUseUpdater,
    checkForAppUpdate,
    installAppUpdate,
    type AppUpdate,
    type UpdateInstallProgress,
} from "@/services/updateService";

interface MiscSettingsPanelProps {
    onSiteDataChanged?: (preferredStoryId?: string | null) => Promise<void> | void;
}

const DELETE_CONFIRMATION = "DELETE ALL";

export function MiscSettingsPanel({ onSiteDataChanged }: MiscSettingsPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [availableUpdate, setAvailableUpdate] = useState<AppUpdate | null>(null);
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
    const [updateProgress, setUpdateProgress] = useState<UpdateInstallProgress | null>(null);

    const handleCheckForUpdates = async () => {
        if (!canUseUpdater()) {
            toast.info("Update checks are available in the desktop app.");
            return;
        }

        try {
            setIsCheckingUpdate(true);
            setUpdateProgress(null);
            const update = await checkForAppUpdate();
            setAvailableUpdate(update);
            if (update) {
                toast.success(`Update ${update.version} is available`);
            } else {
                toast.info("The Story Nexus is up to date");
            }
        } catch (error) {
            console.error("Update check failed:", error);
            toast.error(error instanceof Error ? error.message : "Failed to check for updates");
        } finally {
            setIsCheckingUpdate(false);
        }
    };

    const handleInstallUpdate = async () => {
        if (!availableUpdate) return;

        try {
            setIsInstallingUpdate(true);
            await installAppUpdate(availableUpdate, setUpdateProgress);
        } catch (error) {
            console.error("Update install failed:", error);
            toast.error(error instanceof Error ? error.message : "Failed to install update");
            setIsInstallingUpdate(false);
        }
    };

    const handleCreateBackup = async () => {
        try {
            setIsExporting(true);
            const summary = await siteBackupService.exportSiteBackup();
            const imageNote = summary.skippedImages > 0
                ? ` ${summary.skippedImages} image${summary.skippedImages === 1 ? "" : "s"} were not included.`
                : "";
            toast.success(`Site Backup created with ${summary.stories} stor${summary.stories === 1 ? "y" : "ies"}.${imageNote}`);
        } catch (error) {
            console.error("Site Backup export failed:", error);
            toast.error(error instanceof Error ? error.message : "Failed to create Site Backup");
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsImporting(true);
            const json = await file.text();
            const result = await siteBackupService.importSiteBackup(json);
            await onSiteDataChanged?.(result.importedStoryIds[0] || null);
            toast.success(`Imported ${result.stories} stor${result.stories === 1 ? "y" : "ies"} from Site Backup`);
            result.warnings.forEach((warning) => toast.warning(warning));
        } catch (error) {
            console.error("Site Backup import failed:", error);
            toast.error(error instanceof Error ? error.message : "Failed to import Site Backup");
        } finally {
            setIsImporting(false);
            event.target.value = "";
        }
    };

    const handleDeleteAll = async () => {
        if (deleteConfirmation !== DELETE_CONFIRMATION) return;

        try {
            setIsDeleting(true);
            await siteBackupService.deleteAllUserContent();
            await onSiteDataChanged?.(null);
            setDeleteDialogOpen(false);
            setDeleteConfirmation("");
            toast.success("All user content deleted. AI settings and API keys were preserved.");
        } catch (error) {
            console.error("Delete all content failed:", error);
            toast.error(error instanceof Error ? error.message : "Failed to delete all content");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <section className="space-y-3 rounded-md border border-border bg-card p-4">
                <div>
                    <h3 className="font-medium">App Updates</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        The desktop app checks for updates on startup. You can also check manually here.
                    </p>
                </div>

                {availableUpdate && (
                    <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
                        <div className="font-medium">Update {availableUpdate.version} is available</div>
                        <div className="mt-1 text-muted-foreground">
                            Current version: {availableUpdate.currentVersion}
                        </div>
                        {availableUpdate.body && (
                            <div className="mt-2 whitespace-pre-wrap text-muted-foreground">
                                {availableUpdate.body}
                            </div>
                        )}
                    </div>
                )}

                {updateProgress && (
                    <div className="text-sm text-muted-foreground">
                        {updateProgress.phase === "finished"
                            ? "Installing update..."
                            : formatUpdateProgress(updateProgress)}
                    </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                        variant="outline"
                        onClick={handleCheckForUpdates}
                        disabled={isCheckingUpdate || isInstallingUpdate}
                    >
                        <RefreshCw className={isCheckingUpdate ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                        {isCheckingUpdate ? "Checking..." : "Check for Updates"}
                    </Button>
                    <Button
                        onClick={handleInstallUpdate}
                        disabled={!availableUpdate || isCheckingUpdate || isInstallingUpdate}
                    >
                        {isInstallingUpdate ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        {isInstallingUpdate ? "Installing..." : "Install Update"}
                    </Button>
                </div>
            </section>

            <section className="space-y-3 rounded-md border border-border bg-card p-4">
                <div>
                    <h3 className="font-medium">Site Backup</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Site backups create new content when imported. They do not overwrite or delete existing stories,
                        prompts, agents, or pipelines.
                    </p>
                </div>

                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
                    <div className="flex gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <p className="leading-6">
                            Site Backup includes Brainstorm image attachments. API keys, AI provider settings, and other gallery images are excluded.
                            Enter keys manually in AI Settings after importing on another device.
                        </p>
                    </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                    <Button onClick={handleCreateBackup} disabled={isExporting || isImporting}>
                        <Download className="mr-2 h-4 w-4" />
                        {isExporting ? "Creating..." : "Create Site Backup"}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isExporting || isImporting}
                    >
                        <FileUp className="mr-2 h-4 w-4" />
                        {isImporting ? "Importing..." : "Import Site Backup"}
                    </Button>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleImportBackup}
                />
            </section>

            <section className="space-y-3 rounded-md border border-destructive/35 bg-destructive/5 p-4">
                <div>
                    <h3 className="font-medium text-destructive">Danger Zone</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Delete all user-created stories, chapters, lorebook entries, notes, prompts, agents, pipelines,
                        chats, drafts, scene beats, and images. AI settings and API keys are preserved.
                    </p>
                </div>
                <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All Content
                </Button>
            </section>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete all content?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This permanently deletes user-created stories, chapters, lorebook entries, notes, prompts,
                            agents, pipelines, chats, drafts, scene beats, and images. AI settings and API keys will remain.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="delete-all-confirmation">
                            Type {DELETE_CONFIRMATION} to continue
                        </Label>
                        <Input
                            id="delete-all-confirmation"
                            value={deleteConfirmation}
                            onChange={(event) => setDeleteConfirmation(event.target.value)}
                            autoComplete="off"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            disabled={isDeleting}
                            onClick={() => setDeleteConfirmation("")}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleteConfirmation !== DELETE_CONFIRMATION || isDeleting}
                            onClick={(event) => {
                                event.preventDefault();
                                handleDeleteAll();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete All Content"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function formatUpdateProgress(progress: UpdateInstallProgress) {
    if (!progress.contentLength) {
        return `Downloaded ${formatBytes(progress.downloadedBytes)}`;
    }

    const percent = Math.round((progress.downloadedBytes / progress.contentLength) * 100);
    return `Downloaded ${percent}%`;
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
