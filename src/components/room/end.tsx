import { Button } from '../ui/button';
import { MoreVertical, PhoneOff } from 'lucide-react';

const End = () => {
  const handleLeaveCall = () => {
    console.log('Leaving call...');
  };
  return (
    <div className="flex items-center gap-1">
      <Button
        onClick={handleLeaveCall}
        variant="ghost"
        size="icon"
        className="w-12 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white ml-4"
      >
        <PhoneOff className="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400"
      >
        <MoreVertical className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default End;
