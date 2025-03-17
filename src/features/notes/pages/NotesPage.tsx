import { useParams } from 'react-router';
import NoteList from '../components/NoteList';
import NoteEditor from '../components/NoteEditor';

export default function NotesPage() {
    const { storyId } = useParams();

    if (!storyId) {
        return <div>Story ID is required</div>;
    }

    return (
        <div className="h-full flex">
            <NoteList storyId={storyId} />
            <div className="flex-1">
                <NoteEditor storyId={storyId} />
            </div>
        </div>
    );
} 