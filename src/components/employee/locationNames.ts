/** Demo display names for HCM location ids */
export const LOCATION_NAMES: Record<string, string> = {
  "loc-1": "Headquarters",
  "loc-2": "Remote – West",
  "loc-3": "Remote – East",
};

export function getLocationName(locationId: string) {
  return LOCATION_NAMES[locationId] ?? locationId;
}
