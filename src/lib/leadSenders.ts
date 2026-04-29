// Allowlist of senders that may produce leads. Use a bare email for an exact
// match, or a bare domain to match every address at that domain or its
// subdomains (e.g. 'leadim.cloud' matches noreply@il1.leadim.cloud).
//
// This is a defense-in-depth layer on top of the parser's format check
// (parser requires Hebrew שם:/טלפון: labels). Only emails from allowed senders
// reach the parser.
export const ALLOWED_LEAD_SENDERS = [
  'leadmail@raion.co.il',
  'reefnoyman55@gmail.com',
  'leadim.cloud',
] as const

const FROM_HEADER_EMAIL = /<\s*([^<>\s]+@[^<>\s]+)\s*>|([^\s<>]+@[^\s<>]+)/

export function extractEmailAddress(fromHeader: string | null | undefined): string | null {
  if (!fromHeader) return null
  const match = fromHeader.match(FROM_HEADER_EMAIL)
  if (!match) return null
  const email = (match[1] || match[2] || '').toLowerCase().trim()
  return email.includes('@') ? email : null
}

export function isAllowedLeadSender(fromHeader: string | null | undefined): boolean {
  const email = extractEmailAddress(fromHeader)
  if (!email) return false

  for (const entry of ALLOWED_LEAD_SENDERS) {
    const lower = entry.toLowerCase().trim()
    if (lower.includes('@')) {
      if (email === lower) return true
    } else {
      if (email.endsWith('@' + lower) || email.endsWith('.' + lower)) return true
    }
  }
  return false
}

export function buildGmailFromClause(senders: readonly string[] = ALLOWED_LEAD_SENDERS): string {
  return `(${senders.map((s) => `from:${s}`).join(' OR ')})`
}
