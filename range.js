// Shared by form validation and roll handling. Inclusive integer bounds only.
export function validateRange(min, max, faces) {
    if (min === "" || max === "" || min == null || max == null) return null;
    min = Number(min);
    max = Number(max);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > faces || min > max) return null;
    return { min, max };
}

export function getDieRange(ranges, dieType, faces) {
    const range = ranges?.[dieType];
    return validateRange(range?.min, range?.max, faces) ?? { min: 1, max: faces };
}

export function sampleRange(range, random = Math.random) {
    return range.min + Math.floor(random() * (range.max - range.min + 1));
}
