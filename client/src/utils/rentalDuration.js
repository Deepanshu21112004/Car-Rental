/*
|--------------------------------------------------------------------------
| RENTAL DURATION HELPERS
|--------------------------------------------------------------------------
|
| The car rental system charges according to the exact selected duration.
|
| Examples:
|
| 10 minutes      -> 10 minutes
| 30 minutes      -> 30 minutes
| 45 minutes      -> 45 minutes
| 1 hour          -> 1 hour
| 1 hour 30 min   -> 1 hour 30 minutes
| 2 hours         -> 2 hours
| 2 hours 15 min  -> 2 hours 15 minutes
|
| There is NO minimum one-hour rounding.
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| GET RENTAL MINUTES
|--------------------------------------------------------------------------
|
| Calculates the exact number of minutes between two dates.
|
|--------------------------------------------------------------------------
*/

export const getRentalMinutes = (start, end) => {
    if (!start || !end) {
        return 0;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return 0;
    }

    const difference = endDate.getTime() - startDate.getTime();

    if (difference <= 0) {
        return 0;
    }

    return Math.round(difference / (1000 * 60));
};

/*
|--------------------------------------------------------------------------
| GET RENTAL HOURS
|--------------------------------------------------------------------------
|
| Converts exact rental minutes into decimal hours.
|
| Examples:
|
| 10 minutes = 0.166667 hours
| 30 minutes = 0.5 hours
| 45 minutes = 0.75 hours
| 60 minutes = 1 hour
| 90 minutes = 1.5 hours
|
|--------------------------------------------------------------------------
*/

export const getRentalHours = (start, end) => {
    const minutes = getRentalMinutes(start, end);

    return Number((minutes / 60).toFixed(6));
};

/*
|--------------------------------------------------------------------------
| FORMAT RENTAL DURATION
|--------------------------------------------------------------------------
|
| This function is used for DISPLAY.
|
| Less than 60 minutes:
|
| 10 minutes
| 30 minutes
| 45 minutes
|
| 60 minutes:
|
| 1 hour
|
| More than 60 minutes:
|
| 1 hour 30 minutes
| 2 hours
| 2 hours 15 minutes
|
|--------------------------------------------------------------------------
*/

export const formatRentalDuration = (start, end) => {
    const totalMinutes = getRentalMinutes(start, end);

    if (!totalMinutes) {
        return '—';
    }

    /*
    |--------------------------------------------------------------------------
    | LESS THAN ONE HOUR
    |--------------------------------------------------------------------------
    */

    if (totalMinutes < 60) {
        return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
    }

    /*
    |--------------------------------------------------------------------------
    | ONE HOUR OR MORE
    |--------------------------------------------------------------------------
    */

    const hours = Math.floor(totalMinutes / 60);

    const minutes = totalMinutes % 60;

    /*
    |--------------------------------------------------------------------------
    | EXACT NUMBER OF HOURS
    |--------------------------------------------------------------------------
    */

    if (minutes === 0) {
        return `${hours} hour${hours === 1 ? '' : 's'}`;
    }

    /*
    |--------------------------------------------------------------------------
    | HOURS + MINUTES
    |--------------------------------------------------------------------------
    */

    return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'}`;
};
