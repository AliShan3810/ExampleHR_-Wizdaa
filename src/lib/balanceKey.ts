const SEP = "__" as const;

export function toBalanceKey(employeeId: string, locationId: string) {
  return `${employeeId}${SEP}${locationId}`;
}

export function parseBalanceKey(key: string) {
  const i = key.indexOf(SEP);
  if (i === -1) {
    return { employeeId: key, locationId: "" };
  }
  return {
    employeeId: key.slice(0, i),
    locationId: key.slice(i + SEP.length),
  };
}
