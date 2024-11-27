export function formatFrontmatterValue(value: any): string {
    if (Array.isArray(value)) {
        return value.join(' • ');
    }
    if (value === null || value === undefined) {
        return '';
    }
    return String(value);
}

export function normalizeLogs(source: { [date: string]: any }): FocusLogsType {
    const result: FocusLogsType = {};
    Object.keys(source).forEach(date => {
        const value = source[date];
        if (value === null || value === undefined || value === "") {
            result[date] = { rating: 0 };
        } else if (typeof value === 'object' && 'rating' in value) {
            result[date] = value;
        } else if (typeof value === 'number') {
            result[date] = { rating: value };
        } else if (typeof value === 'string') {
            const numValue = Number(value);
            if (isNaN(numValue)) {
                result[date] = { rating: 0, remarks: value };
            } else {
                result[date] = { rating: numValue };
            }
        }
    });
    return result;
}
