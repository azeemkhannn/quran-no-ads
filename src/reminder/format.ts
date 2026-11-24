import type { ReminderTime } from '@/store/reader-store';

/** 5:00 → "5:00 AM", 21:30 → "9:30 PM". */
export function formatTime({ hour, minute }: ReminderTime): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}
