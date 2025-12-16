/**
 * IBAN detection and formatting utilities.
 *
 * Detects IBAN numbers in transaction descriptions and formats them for display.
 */

/**
 * Turkish IBAN format: TR + 2 check digits + 4 bank code + 5 zeros + 16 account number
 * Total: 26 characters
 * Example: TR330006100519786457841326
 */
const IBAN_PATTERN = /TR\d{2}\s?\d{4}\s?\d{5}\s?\d{16}/gi;

/**
 * Format IBAN for display (add spaces every 4 characters).
 * Example: TR330006100519786457841326 -> TR33 0006 1005 1978 6457 8413 26
 */
export function formatIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, "").toUpperCase();
  if (!cleaned.startsWith("TR")) {
    return iban;
  }
  return cleaned.match(/.{1,4}/g)?.join(" ") ?? iban;
}

/**
 * Extract IBAN from text.
 * Returns the first IBAN found, or null if none found.
 */
export function extractIBAN(text: string | null | undefined): string | null {
  if (!text || typeof text !== "string") {
    return null;
  }

  const match = text.match(IBAN_PATTERN);
  if (match && match.length > 0) {
    return match[0]!.replace(/\s/g, "").toUpperCase();
  }

  return null;
}

/**
 * Enhance description with IBAN information if detected.
 *
 * If an IBAN is found in the description, formats it and adds a note.
 * Example: "TR330006100519786457841326'a gönderildi" -> "TR33 0006 1005 1978 6457 8413 26 IBAN'ına gönderildi"
 */
export function enhanceDescriptionWithIBAN(description: string | null | undefined): string {
  if (!description || typeof description !== "string") {
    return "";
  }

  const iban = extractIBAN(description);
  if (!iban) {
    return description.trim();
  }

  const formattedIBAN = formatIBAN(iban);
  
  // Check if description already contains formatted IBAN or "IBAN" keyword
  if (description.includes("IBAN") || description.includes(formattedIBAN)) {
    return description.trim();
  }

  // Replace raw IBAN with formatted version and add context
  const enhanced = description
    .replace(IBAN_PATTERN, (match) => {
      return `${formatIBAN(match)} IBAN'ına gönderildi`;
    })
    .trim();

  return enhanced;
}

