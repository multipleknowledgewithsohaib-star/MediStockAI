const REPORT_DATE_CUTOFF_ISO = "2026-04-30";

export const REPORT_DATE_CUTOFF = new Date(`${REPORT_DATE_CUTOFF_ISO}T23:59:59.999Z`);

const parseDateValue = (value: unknown): Date | null => {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
    }

    const text = String(value ?? "").trim();
    if (!text) {
        return null;
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isWithinReportWindow = (value: unknown) => {
    const date = parseDateValue(value);
    return Boolean(date && date.getTime() <= REPORT_DATE_CUTOFF.getTime());
};

export const clampDateToReportCutoff = (value: unknown) => {
    const date = parseDateValue(value);
    if (!date) {
        return "";
    }

    const safeDate = date.getTime() > REPORT_DATE_CUTOFF.getTime() ? REPORT_DATE_CUTOFF : date;
    return safeDate.toISOString().split("T")[0];
};
