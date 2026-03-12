import type { StateCreator } from 'zustand';
import type { ConfStoreState } from '../type';
import type { NotificationSettings } from '@/types';

export interface SettingsSlice {
  open: boolean;
  toggle: () => void;
  notifications: NotificationSettings;
  toggleNotification: (notification: keyof NotificationSettings) => void;
  noiseSuppression: boolean;
  toggleNoiseSuppression: () => void;
}

export const createSettingsSlice: StateCreator<
  ConfStoreState,
  [],
  [['zustand/immer', SettingsSlice]],
  SettingsSlice
> = set => ({
  open: false,
  noiseSuppression: true,
  toggle: () =>
    set(state => {
      state.settings.open = !state.settings.open;
      return state;
    }),
  toggleNoiseSuppression: () =>
    set(state => {
      state.settings.noiseSuppression = !state.settings.noiseSuppression;
      return state;
    }),
  notifications: {
    peerJoined: false,
    peerLeave: false,
    newMessage: true,
    handRaise: true,
    error: true,
  },
  toggleNotification: notification =>
    set(state => {
      state.settings.notifications[notification] =
        !state.settings.notifications[notification];
      return state;
    }),
});
