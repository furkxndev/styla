/** Sunucu yerel saatine göre YYYY-MM-DD gün anahtarı. */
export const toDayKey = (date: Date = new Date()): string => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** "YYYY-MM-DD" biçimini doğrular (istemciden gelen tarihler için). */
export const isDayKey = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value);
