import { useCollection } from './collections'
import type { ContentDoc } from './types'

export const legalSlugs = ['privacy', 'terms', 'guidelines', 'messaging', 'survey-consent', 'fund'] as const
// Bump a document's `version` when its meaning changes; members are asked to accept the new Terms and Privacy Policy.
export const consentSlugs = ['terms', 'privacy'] as const
const NOW = '2026-10-15T12:00:00Z'
const L = (id: string, title: string, intro: string, body: string): ContentDoc => ({ id, title, intro, body, kind: 'legal', status: 'published', version: 1, updatedBy: 'seed', updatedAt: NOW })

const privacy = `# Privacy Policy

Bracketed text like [this] is filled in on the Organization details page. **This is a draft template. It has not been reviewed by an attorney.**

## What we collect
- **You give us:** your name, email, phone, city, household members, survey answers, goals, club and event choices, and messages to our team.
- **Sensitive details you choose to add:** income range, money sent abroad, immigration dates, where your papers are kept, and credit goals. These are optional and, apart from the survey, only you can see them.
- **Payments:** handled by Stripe. We receive the status and amount of a payment, never your full card number.
- **Usage:** which screens you open and for how long, so we can improve the app. You can switch this off in Account.

## What we do not collect
We do not store copies of your documents, bank or card numbers, passwords, or credit reports.

## How we use it
To run your membership, send the reminders you ask for, decide which services to build, report to the community in groups, and keep the platform secure.

## Who can see it
- **Staff** see only what their role needs. Support staff see member contact details and requests. The data team sees survey answers without needing your name. Nobody on staff can see your immigration dates, document locations or credit goals.
- **The community** sees only totals for groups of {{min_group}} or more households. Never an individual.
- **Your spouse or adult family members** see shared household items. Private items stay private unless you choose to share them.

## Who we share it with
Service providers who help us run the platform: hosting and database (Supabase), payments (Stripe), email (Resend), and messaging (WhatsApp, only if you opted in). They may use your data only to provide their service to us. We share information with a partner such as an attorney only if you ask us to introduce you. **We do not sell your data and we do not use it for advertising.**

## How long we keep it
While you are a member and for up to {{retention_years}} years afterward for records we are required to keep. Survey answers can be kept in anonymous form.

## Your choices
You can ask us to see, correct, export or delete your data, turn off WhatsApp, email or usage tracking, or leave the community at any time. Email {{contact_email}}. We will answer within 30 days.

## Children
Accounts are for adults. Information about children is limited to what a parent chooses to tell us about the household.

## Security
Access is limited by role, activity on sensitive records is logged, and data is encrypted in transit. No system is perfectly secure; tell us right away if you suspect a problem.

## Changes
When this policy changes in a way that matters, we will ask you to review it again.

## Contact
{{legal_name}}, {{address}}. {{contact_email}}`

const terms = `# Terms and Membership Agreement

**This is a draft template. It has not been reviewed by an attorney.** Bracketed text is filled in on the Organization details page.

## 1. Who we are
The platform is run by {{legal_name}} ("we"), for the {{community}}. By joining you agree to these terms and to our Privacy Policy and Community Guidelines.

## 2. Membership
- Membership is per household. The person who signs up is the household head and can invite other adults in the household, each with their own sign-in.
- You must be 18 or older. Information you give us must be true and kept up to date.
- Plans and monthly dues are shown when you join. Dues are charged through Stripe on a recurring basis until you cancel.

## 3. Dues, cancelling and refunds
You can cancel any time from Account or by writing to us. Cancelling stops future charges; it does not refund dues already paid unless we say so in writing or the law requires it. If a payment fails we will tell you and try again before pausing your membership. Dues may change with 30 days' notice.

## 4. What membership includes
Access to the member portal, reports, events, clubs and the services marked "open". Services marked "soon" are plans, not promises, and may change or not happen. Your votes guide our priorities but do not bind us.

## 5. Not professional advice
Tools, calculators, checklists and reminders are for information and organization only. They are **not legal, immigration, tax, financial, insurance or medical advice.** Check official sources and talk to a licensed professional about your situation.

## 6. Independent partners
Attorneys, accountants, banks, brokers and other partners are independent businesses. We check licenses and insurance but do not endorse them or guarantee their work. Your agreement is with them, not us. We tell you if we receive a referral payment.

## 7. Community funds
Any community pool (for example, for bereavement costs) is a fund run by the community. **It is not insurance.** Help from it follows its written rules, is decided by the people we name for that purpose, and is not guaranteed.

## 8. The community investment fund
Any investment fund connected to the community is a separate entity. Reports you see are for transparency only. They are not an offer to sell or a request to buy any investment.

## 9. Your conduct
Follow the Community Guidelines. We may remove content or suspend a membership that breaks them or puts others at risk.

## 10. Your account
Keep your sign-in secure. Tell us if you think someone else has used it.

## 11. Ending membership
You may leave at any time. We may end a membership for serious or repeated breaches of these terms, with notice where practical.

## 12. Disclaimers and limits
The platform is provided "as is". To the extent the law allows, we are not responsible for indirect losses, for the acts of partners, or for events outside our control. Nothing here limits rights that cannot be limited by law.

## 13. Disputes
These terms are governed by the laws of the State of [governing state]. We will try to resolve any dispute by talking first. [Venue and dispute process to be confirmed by counsel.]

## 14. Changes
We will give notice of material changes and ask you to accept them to continue.

## Contact
{{legal_name}}, {{address}}. {{contact_email}}`

const guidelines = `# Community Guidelines

We are a community of families from many regions, languages, faiths and politics. These guidelines keep it welcoming.

## Be respectful
- Treat everyone with dignity. No harassment, threats, slurs, or demeaning talk about tribe, region, religion, gender, sexuality, immigration status or income.
- Disagree without attacking.

## Protect each other's privacy
- Do not share another member's personal details, photos or situation without their permission.
- What is said in a club or at an event about someone's finances, health or immigration stays there.

## Keep it honest
- No scams, pyramid schemes, or pressure to buy or invest. Do not sell to members through our channels without approval.
- Do not claim to speak for the community.

## Keep it safe
- If someone is in danger, call 911 first, then tell us.
- Do not use the platform for anything illegal.

## Politics and conflict back home
Home-country politics can divide us. Discuss it in private if you wish; do not use community spaces to campaign or attack other members.

## Reporting and what happens next
Tell us at {{contact_email}}. We review reports fairly and in confidence. Responses range from a conversation to removal from a space or from membership. You can ask for a second look.`

const messaging = `# Messaging Consent

We send messages only for things you asked for or that your membership needs.

## What we may send
- **Reminders:** event times, invoices and payment problems, immigration or paperwork dates you saved, and goal milestones.
- **Updates:** the quarterly community report and important announcements.

## Channels
Email, and WhatsApp if you opted in. You can change either at any time in Account.

## How often
Usually a few messages a month. Reminders you set may add more around their dates.

## Opting out
Reply STOP to a WhatsApp message, use the unsubscribe link in any email, or switch it off in Account. Bills and security notices may still reach you by email while you are a member.

## Cost
We do not charge for messages. Your phone carrier may charge for data or texts.`

const surveyConsent = `# Survey Consent and Data Use

Your answers help us build services that fit our families.

## What is required
A short core set: household size, city, languages, your top needs, and agreeing to this notice. It takes about two minutes.

## What is optional
Everything else, such as income range, money sent abroad, and work. Each optional question has "Prefer not to say". You will not lose any service by skipping them. If a service needs a detail, we ask for it then.

## How we use answers
- To count and describe the community in groups of {{min_group}} or more households.
- To decide which services to build and to find the right partners.
- Staff who review replies see them without your name where possible.

## What we will not do
Sell your answers, show them to other members, or share them with a partner without your say-so.

## Your choices
You can change or delete your answers any time by writing to {{contact_email}}.`

const fund = `# Community Fund: Important Information

This page explains the community investment fund in plain language.

- **Transparency, not an offer.** Fund reports shown here are for information. They are **not an offer to sell, or a solicitation to buy, any security or investment.** The fund is not open to outside investors.
- **Separate entity.** The fund is a separate company from the community platform and has its own accounts and rules.
- **Purpose.** To grow capital whose returns can help pay for community services, within a written policy approved by the board.
- **Risk.** Investments can lose value. Past results do not predict future results. Figures may be estimates until verified.
- **Conflicts.** Any holding or trade that involves a person connected to the community is marked "related party" in our reports.
- **Not your dues.** Your membership dues are not invested in the fund unless we tell you so in writing.
- **Future opportunities.** If the fund ever accepts outside investors, that would happen only through a separate process with legal documents, and only to people who are eligible under the law.`

const org = `legal_name: [Operator legal name]
contact_email: [contact email]
address: [mailing address]
community: Ugandan Community of DFW
min_group: 5
retention_years: 7`

const about = `## Our purpose
We built this so no family here has to figure out money, papers and crises alone. Together we can see what we need, pool our strength, and get better prices and better help than any one household could.

### See ourselves
The State of Community report counts who we are and what we need, anonymously, so the services we build match real needs.

### Pool our strength
Group rates, vetted professionals and shared funds that a single household could not get.

### Build lasting security
Over time, a community fund whose returns help pay for our services, so the work outlasts any one person.

## Our promises to you
- **Your answers are private.** We only show groups of 5 or more households, never an individual.
- **We never sell your data.** Your immigration dates, papers and credit goals are visible only to you.
- **Partners are independent.** We check licenses and insurance, but we do not endorse them or guarantee their work. We tell you if we receive any referral payment.
- **We show where the money goes.** Every quarter we publish income, spending and how our community fund is doing. Individual pay is never shown.
- **You decide what we build next.** Your votes on the Services page set our priorities.
- **The community fund is not an offer to invest.** Seeing its report does not ask you for money.`

export const seedContent = (): ContentDoc[] => [
  { id: 'about', title: 'Why the Ugandan Community of DFW exists', intro: 'We built this so no family here has to figure out money, papers and crises alone.', body: about, kind: 'page', status: 'published', version: 1, updatedBy: 'seed', updatedAt: NOW },
  L('privacy', 'Privacy Policy', 'How we collect, use and protect your information.', privacy),
  L('terms', 'Terms and Membership Agreement', 'The agreement between you and the community.', terms),
  L('guidelines', 'Community Guidelines', 'How we treat each other.', guidelines),
  L('messaging', 'Messaging Consent', 'What we send you and how to stop it.', messaging),
  L('survey-consent', 'Survey Consent and Data Use', 'What the survey is for and what is optional.', surveyConsent),
  L('fund', 'Community Fund: Important Information', 'What the fund reports are and are not.', fund),
  { id: 'org', title: 'Organization details', intro: 'Used to fill in the legal pages. One "name: value" per line.', body: org, kind: 'settings', status: 'published', version: 1, updatedBy: 'seed', updatedAt: NOW },
]

export function parseVars(org?: ContentDoc): Record<string, string> {
  const v: Record<string, string> = {}
  for (const line of (org?.body ?? '').split('\n')) { const i = line.indexOf(':'); if (i > 0) v[line.slice(0, i).trim()] = line.slice(i + 1).trim() }
  return v
}

export function useContent() {
  const c = useCollection<ContentDoc>('content', seedContent, true)
  // Until staff publish an edit, readers see the built-in draft, so legal pages are never blank.
  const byId = (id: string) => c.items.find(d => d.id === id) ?? (c.loading ? undefined : seedContent().find(d => d.id === id))
  return { ...c, byId, vars: parseVars(byId('org')) }
}
