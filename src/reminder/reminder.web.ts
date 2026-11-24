// Web build: browsers can't run a daily reminder while the page is closed, so it is not offered.
import { readerStore, type ReminderTime } from '@/store/reader-store';
export { formatTime } from './format';

export const REMINDER_SUPPORTED = false;

export async function turnOnReminder(): Promise<'on' | 'blocked'> {
  return 'blocked';
}

export async function setReminderTime(time: ReminderTime) {
  readerStore.setReminderTime(time);
}

export async function turnOffReminder() {}

export async function initReminder() {}
