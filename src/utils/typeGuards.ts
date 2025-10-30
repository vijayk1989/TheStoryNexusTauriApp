/**
 * Type guard utilities for runtime type checking
 * Re-exports from @sindresorhus/is with custom extensions
 */

import is from "@sindresorhus/is";

// Re-export commonly used type guards from @sindresorhus/is
export const {
    string: isString,
    number: isNumber,
    boolean: isBoolean,
    array: isArray,
    object: isObject,
    error: isError,
    nullOrUndefined,
} = is;

// Custom type guard for non-null/undefined values
export const isDefined = <T>(value: T | null | undefined): value is T =>
    !is.nullOrUndefined(value);

// Custom type guard for valid metadata values
export const isValidMetadataValue = (
    value: unknown
): value is boolean | string | number =>
    is.boolean(value) || is.string(value) || is.number(value);

// Custom type guard for property checking
export const hasProperty = <K extends string>(
    obj: unknown,
    key: K
): obj is Record<K, unknown> => is.object(obj) && key in obj;
