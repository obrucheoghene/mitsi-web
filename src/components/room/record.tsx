import { useState } from 'react';
import { Circle } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { usePeerMe } from '@/store/conf/hooks';
import { useSignaling } from '@/hooks/use-signaling';
import { Actions } from '@/types/actions';
import { Tag } from '@/types';

const Record = () => {
  const { signalingService } = useSignaling();
  const peerMe = usePeerMe();
  const [recording, setRecording] = useState(false);

  const isHost = peerMe?.tag === Tag.Host;
  if (!isHost) return null;

  const toggleRecording = () => {
    signalingService?.sendMessage({
      action: Actions.Record,
      args: { recording: !recording },
    });
    setRecording(prev => !prev);
  };

  return (
    <Button
      onClick={toggleRecording}
      variant="ghost"
      size="icon"
      title={recording ? 'Stop recording' : 'Start recording'}
      className={cn(
        'w-12 h-12 cursor-pointer rounded-xl transition-all duration-200 text-white',
        recording
          ? 'bg-red-600 hover:bg-red-700'
          : 'from-white/15 to-white/1 bg-linear-to-bl backdrop-blur-xl'
      )}
    >
      <Circle
        className={cn('w-5 h-5', recording && 'fill-white animate-pulse')}
      />
    </Button>
  );
};

export default Record;
