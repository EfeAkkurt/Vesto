export const isValidEth = (addr: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(addr.trim());

export const isValidStellar = (addr: string): boolean => /^G[A-Z2-7]{55}$/.test(addr.trim());
