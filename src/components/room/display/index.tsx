import Sidebar from '../sidebar';
import MainGrid from './main-grid';
import ScreenView from './screen-view';

const Display = () => {
  return (
    <div
      className={`${'fixed h-full inset-0  pt-10 pb-18 px-3 flex  flex-row w-full justify-between overflow-hidden '}`}
    >
      {/* screen sharing */}
      <ScreenView />
      {/* peers grid */}
      <MainGrid />
      {/* chat and attendees */}
      <Sidebar />
    </div>
  );
};

export default Display;
