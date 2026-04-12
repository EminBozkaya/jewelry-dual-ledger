export function isValidTC(tc: string): boolean {
  if (!/^\d{11}$/.test(tc)) return false;
  if (tc[0] === "0") return false;

  const digits = tc.split("").map(Number);
  
  const sumOdd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const sumEven = digits[1] + digits[3] + digits[5] + digits[7];
  
  const digit10 = (sumOdd * 7 - sumEven) % 10;
  if (digit10 < 0 || digit10 !== digits[9]) return false;
  
  const digit11 = (sumOdd + sumEven + digits[9]) % 10;
  if (digit11 !== digits[10]) return false;

  return true;
}
