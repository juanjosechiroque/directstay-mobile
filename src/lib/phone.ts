export function buildInternationalPhone(countryCode: string, localNumber: string): string {
  const digits = localNumber.replace(/\D/g, '');
  return digits ? `+${countryCode}${digits}` : '';
}
