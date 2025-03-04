import { useParams } from 'react-router';
import ChatList from '../components/ChatList';
import ChatInterface from '../components/ChatInterface';

export default function BrainstormPage() {
    const { storyId } = useParams<{ storyId: string }>();

    if (!storyId) {
        return <div>Story ID not found</div>;
    }

    return (
        <div className="flex h-full">
            <ChatList storyId={storyId} />
            <div className="flex-1 h-full">
                <ChatInterface storyId={storyId} />
            </div>
        </div>
    );
} 