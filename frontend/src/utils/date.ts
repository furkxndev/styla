import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isYesterday,
  parseISO,
} from 'date-fns';
import { tr } from 'date-fns/locale';

export const toISODate = (date: Date = new Date()) => format(date, 'yyyy-MM-dd');

export const todayKey = () => toISODate(new Date());

const safeParse = (value: string | Date) =>
  typeof value === 'string' ? parseISO(value) : value;

export const formatLongDate = (value: string | Date) =>
  format(safeParse(value), 'd MMMM EEEE', { locale: tr });

export const formatShortDate = (value: string | Date) =>
  format(safeParse(value), 'd MMM', { locale: tr });

export const formatTime = (value: string | Date) => format(safeParse(value), 'HH:mm');

export const formatRelative = (value: string | Date) => {
  const date = safeParse(value);
  if (isToday(date)) return 'Bugün';
  if (isYesterday(date)) return 'Dün';
  return `${formatDistanceToNowStrict(date, { locale: tr })} önce`;
};

export const greetingForHour = (hour = new Date().getHours()) => {
  if (hour < 6) return 'İyi geceler';
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
};

/** "08:00" -> { hour: 8, minute: 0 } */
export const parseTimeString = (value: string) => {
  const [hourStr, minuteStr] = value.split(':');
  return {
    hour: Number.parseInt(hourStr, 10) || 0,
    minute: Number.parseInt(minuteStr, 10) || 0,
  };
};

export const formatTimeString = (hour: number, minute: number) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

export const dateFromTimeString = (value: string) => {
  const { hour, minute } = parseTimeString(value);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
};
