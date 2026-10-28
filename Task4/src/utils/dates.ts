/** Calendar date as UTC midnight, so a DATE column does not shift across time zones. */
export const calendarDate = (value: Date | string): Date => {
  if (typeof value === 'string') {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  }
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
};

export const formatDateOnly = (value: Date | string): string => {
  const date = calendarDate(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ageInYears = (dob: Date, today = new Date()): number => {
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const month = today.getUTCMonth() - dob.getUTCMonth();
  if (month < 0 || (month === 0 && today.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
};
