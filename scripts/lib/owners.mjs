// Decision-maker candidates from official-site text. Output is a CANDIDATE list for human review;
// nothing becomes a verified decision-maker without manual confirmation (config/manual_review.json).
const NAME = "([A-Z][a-z'’]+(?:[ ][A-Z]\\.)?(?:[ ][A-Z][a-z'’-]+){1,2})";
// Titles are matched with explicit case variants so the capitalised-name pattern stays case-sensitive.
const TITLE = '(?:[Oo]wner|OWNER|[Ff]ounder|FOUNDER|[Cc]o-[Ff]ounder|[Pp]resident|PRESIDENT|[Pp]roprietor|CEO|[Pp]rincipal|[Gg]eneral [Mm]anager)';
const NOT_NAME = /^(The|Our|Your|Call|Contact|About|Home|Business|Service|Heating|Cooling|Air|New|North|South|West|East|Free|Get|Learn|Read|Meet|Licensed|Family|Company|Customer|Jersey|Bergen|Essex|Hudson|Passaic)\b/;
export function ownerCandidates(text) {
  const out = new Map();
  const t = String(text || '');
  const res = [
    new RegExp(`(?<![Bb]usiness |[Hh]ome)\\b${TITLE}[,:]?[ \\t]+(?:and[ \\t]+\\w+[ \\t]+)?${NAME}`, 'g'),
    new RegExp(`${NAME},?[ \\t]+(?:the[ \\t]+)?(?:company[ \\t]+)?${TITLE}\\b`, 'g'),
    new RegExp(`(?:[Ff]ounded|[Ss]tarted|[Ee]stablished|[Oo]wned and operated)[ \\t]+by[ \\t]+${NAME}`, 'g'),
  ];
  for (const re of res) for (const m of t.matchAll(re)) {
    let name = m[1].trim();
    while (NOT_NAME.test(name)) name = name.split(' ').slice(1).join(' '); // "Meet Dana Kowalski" -> "Dana Kowalski"
    if (name.split(' ').length < 2) continue;
    const ctx = t.slice(Math.max(0, m.index - 60), m.index + m[0].length + 40).replace(/\s+/g, ' ');
    if (/business owner|homeowner|property owner|home owner|renter|landlord/i.test(ctx.slice(0, 80)) && !/founder|president/i.test(m[0])) continue;
    if (!out.has(name)) out.set(name, ctx);
  }
  return [...out].map(([name, context]) => ({ name, context })).slice(0, 6);
}
