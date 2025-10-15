// Minimal className joiner to avoid external deps
export function cn(...inputs: Array<string | undefined | false | null>) {
  return inputs.filter(Boolean).join(" ")
}
