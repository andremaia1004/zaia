/**
 * Normalizes a phone number by removing all non-digit characters.
 * Useful for consistently storing and querying phone numbers in the database.
 */
export function normalizePhone(phone: string): string {
    if (!phone) return ''
    return phone.replace(/\D/g, '')
}
