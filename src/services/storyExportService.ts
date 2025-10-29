import { toast } from 'react-toastify';
import { StoryExportService } from './export/StoryExportService';
import { StoryImportService } from './export/StoryImportService';
import { FileDownloadUtil } from './export/FileDownloadUtil';

const exportService = new StoryExportService();
const importService = new StoryImportService();

export const storyExportService = {
    /**
     * Export a complete story with all related data
     */
    exportStory: async (storyId: string): Promise<void> => {
        try {
            const exportData = await exportService.exportStory(storyId);
            FileDownloadUtil.downloadStoryExport(exportData, exportData.story);
            toast.success(`Story "${exportData.story.title}" exported successfully`);
        } catch (error) {
            console.error('Story export failed:', error);
            toast.error(`Export failed: ${(error as Error).message}`);
            throw error;
        }
    },

    /**
     * Import a complete story with all related data
     * Returns the ID of the newly imported story
     */
    importStory: async (jsonData: string): Promise<string> => {
        try {
            const data = FileDownloadUtil.parseImportFile(jsonData);
            const newStoryId = await importService.importStory(data);
            toast.success(`Story "${data.story.title} (Imported)" imported successfully`);
            return newStoryId;
        } catch (error) {
            console.error('Story import failed:', error);
            toast.error(`Import failed: ${(error as Error).message}`);
            throw error;
        }
    }
};

// Export individual services for direct access when needed
export { StoryExportService, StoryImportService, FileDownloadUtil };
