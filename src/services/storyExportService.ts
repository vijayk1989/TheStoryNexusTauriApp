import { toast } from 'react-toastify';
import { StoryExportService } from './export/StoryExportService';
import { StoryImportService } from './export/StoryImportService';
import { FileDownloadUtil } from './export/FileDownloadUtil';
import { attemptPromise } from '@jfdi/attempt';

const exportService = new StoryExportService();
const importService = new StoryImportService();

export const storyExportService = {
    /**
     * Export a complete story with all related data
     */
    exportStory: async (storyId: string): Promise<void> => {
        const [error, exportData] = await attemptPromise(() =>
            exportService.exportStory(storyId)
        );

        if (error) {
            console.error('Story export failed:', error);
            toast.error(`Export failed: ${error.message}`);
            throw error;
        }

        FileDownloadUtil.downloadStoryExport(exportData, exportData.story);
        toast.success(`Story "${exportData.story.title}" exported successfully`);
    },

    /**
     * Import a complete story with all related data
     * Returns the ID of the newly imported story
     */
    importStory: async (jsonData: string): Promise<string> => {
        const [parseError, data] = await attemptPromise(() =>
            Promise.resolve(FileDownloadUtil.parseImportFile(jsonData))
        );

        if (parseError) {
            console.error('Story import failed:', parseError);
            toast.error(`Import failed: ${parseError.message}`);
            throw parseError;
        }

        const [importError, newStoryId] = await attemptPromise(() =>
            importService.importStory(data)
        );

        if (importError) {
            console.error('Story import failed:', importError);
            toast.error(`Import failed: ${importError.message}`);
            throw importError;
        }

        toast.success(`Story "${data.story.title} (Imported)" imported successfully`);
        return newStoryId;
    }
};

// Export individual services for direct access when needed
export { StoryExportService, StoryImportService, FileDownloadUtil };
