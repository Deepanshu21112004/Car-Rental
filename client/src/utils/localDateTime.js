/** Format a Date as YYYY-MM-DDTHH:mm in the browser's local timezone for datetime-local inputs. */
export const toLocalDateTimeInput = (date = new Date()) => {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) return '';
    const pad = (part) => String(part).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
};

/** Convert a datetime-local value (which represents local wall time) to an ISO timestamp. */
export const localDateTimeToIso = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};
