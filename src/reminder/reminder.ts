// Daily reading reminder: one local notification every day, at a time the reader picks (5:00 AM by default).
// It is scheduled on the phone itself, so it works fully offline (no server, no push service).
// The web build uses reminder.web.ts, which does nothing.
import { Platform } from 'react-native';
import {
  AndroidImportance,
  cancelAllScheduledNotificationsAsync,
  getAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  SchedulableTriggerInputTypes,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { readerStore, type ReminderTime } from '@/store/reader-store';
export { formatTime } from './format';

export const REMINDER_SUPPORTED = true;

const CHANNEL = 'daily-reminder';

// Also show the reminder if the app happens to be open at 5:00.
setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function schedule() {
  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(CHANNEL, {
      name: 'Daily reading reminder',
      importance: AndroidImportance.DEFAULT,
    });
  }
  // Only this app's own reminder is ever scheduled, so clearing first avoids duplicates.
  await cancelAllScheduledNotificationsAsync();
  await scheduleNotificationAsync({
    content: {
      title: 'Time to read the Quran',
      body: 'Your daily reading is waiting. Continue where you left off.',
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: readerStore.getState().reminderTime.hour,
      minute: readerStore.getState().reminderTime.minute,
      channelId: CHANNEL,
    },
  });
}

/**
 * Turns the reminder on, asking for notification permission if needed.
 * Returns 'on', or 'blocked' when the phone does not allow notifications for the app.
 */
export async function turnOnReminder(): Promise<'on' | 'blocked'> {
  try {
    const { granted } = await requestPermissionsAsync();
    if (!granted) {
      readerStore.setReminder(false);
      return 'blocked';
    }
    await schedule();
    readerStore.setReminder(true);
    return 'on';
  } catch {
    readerStore.setReminder(false);
    return 'blocked';
  }
}

/** Saves a new reminder time, and reschedules the reminder if it is on. */
export async function setReminderTime(time: ReminderTime) {
  readerStore.setReminderTime(time);
  if (!readerStore.getState().reminder) return;
  try {
    await schedule();
  } catch {
    // Keep the saved time; the next app start schedules it again (see initReminder).
  }
}

export async function turnOffReminder() {
  readerStore.setReminder(false);
  try {
    await cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing scheduled, or the module is unavailable: the reminder is off either way.
  }
}

/**
 * Called once at app start.
 * - New install: does nothing until the welcome screens are done; finishing them calls this again,
 *   which shows the phone's notification permission prompt once (over Home).
 * - Welcomed but never offered (an update from before reminders existed): offers it once.
 * - Later: if the reminder is on, makes sure it is still scheduled (for example after an app update
 *   or a backup restore), and turns it off if notifications were blocked in the phone settings.
 */
export async function initReminder() {
  try {
    const { reminder, welcomed } = readerStore.getState();
    // New install: wait until the welcome screens are done (they call this again at the end).
    if (!welcomed) return;
    if (reminder === null) {
      await turnOnReminder();
      return;
    }
    if (!reminder) return;
    const { granted } = await getPermissionsAsync();
    if (!granted) {
      readerStore.setReminder(false);
      return;
    }
    const scheduled = await getAllScheduledNotificationsAsync();
    if (scheduled.length === 0) await schedule();
  } catch {
    // A reminder problem must never stop the Quran from opening.
  }
}
