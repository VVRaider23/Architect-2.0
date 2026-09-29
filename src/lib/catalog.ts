/** Content that today's Architect offers: Lyzr Studio agents, the prompt library, app themes and consultant ideas. */

export interface StudioAgent {
  id: string;
  name: string;
  description: string;
  tools: string[];
}

/** Sample agents from a Lyzr Studio workspace (Architect's "+ Add Studio agents"). */
export const STUDIO_AGENTS: StudioAgent[] = [
  { id: 'kyc-reader', name: 'KYC Document Reader', description: 'Reads IDs and proof-of-address documents and pulls out the fields.', tools: ['OCR', 'Document parser'] },
  { id: 'fraud-signals', name: 'Fraud Signal Checker', description: 'Scores a claim against known fraud patterns and explains the score.', tools: ['Rules engine'] },
  { id: 'email-summarizer', name: 'Email Summarizer', description: 'Turns long customer emails into a three-line summary for handlers.', tools: ['Gmail (read)'] },
  { id: 'policy-qa', name: 'Policy Q&A', description: 'Answers questions from policy PDFs and quotes the clause it used.', tools: ['Knowledge base'] },
  { id: 'tone-checker', name: 'Tone Checker', description: 'Checks replies for tone and plain language before a handler sends them.', tools: [] },
];

export const STUDIO_URL = 'https://studio.lyzr.ai';

export interface LibraryPrompt {
  title: string;
  prompt: string;
}

/** Architect's prompt library, grouped by team. */
export const PROMPT_LIBRARY: { group: string; items: LibraryPrompt[] }[] = [
  {
    group: 'Insurance',
    items: [
      { title: 'Claims triage', prompt: 'A claims triage assistant: reads claim emails and PDFs, checks the policy, flags risky claims for a human, and drafts replies for our claims team.' },
      { title: 'Renewal reminders', prompt: 'A renewal assistant that finds policies expiring in 30 days and drafts a personal reminder email for each customer.' },
      { title: 'Broker inbox', prompt: 'A broker inbox assistant that sorts broker emails by urgency, answers routine questions, and drafts replies for underwriters.' },
    ],
  },
  {
    group: 'Banking',
    items: [
      { title: 'KYC document check', prompt: 'A KYC assistant that reads ID documents and bank statements, checks them against our onboarding rules, and lists what is missing for the analyst.' },
      { title: 'Dispute handler', prompt: 'A card dispute assistant that reads the customer’s dispute, checks the transaction history, and drafts the chargeback case for review.' },
    ],
  },
  {
    group: 'Healthcare',
    items: [
      { title: 'Patient intake', prompt: 'A patient intake assistant that turns intake forms into structured records, flags urgent symptoms for a nurse, and drafts the next-step message.' },
      { title: 'Prior authorization', prompt: 'A prior authorization assistant that checks a request against the payer’s criteria and drafts the submission for a nurse to approve.' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { title: 'Policy Q&A', prompt: 'A policy Q&A assistant that answers call-centre staff questions from our policy documents and always quotes the clause it used.' },
      { title: 'Invoice checker', prompt: 'An invoice checker that matches supplier invoices to purchase orders, flags mismatches, and drafts the query email to the supplier.' },
    ],
  },
];

export interface AppTheme {
  id: string;
  name: string;
  primary: string;
  hover: string;
  soft: string;
  font: string;
}

/** A few of Architect's theme presets for the generated app. */
export const APP_THEMES: AppTheme[] = [
  { id: 'harbor', name: 'Harbor', primary: '#0F3B5F', hover: '#0B2E4A', soft: '#E7EEF6', font: 'var(--font-geist-sans), system-ui, sans-serif' },
  { id: 'evergreen', name: 'Evergreen', primary: '#1F5E4A', hover: '#174A3A', soft: '#E5F1EC', font: 'var(--font-geist-sans), system-ui, sans-serif' },
  { id: 'plum', name: 'Plum', primary: '#5B2A86', hover: '#48206B', soft: '#F0E8F7', font: 'var(--font-geist-sans), system-ui, sans-serif' },
  { id: 'ember', name: 'Ember', primary: '#9A3412', hover: '#7C2A0E', soft: '#FBEDE6', font: 'var(--font-geist-sans), system-ui, sans-serif' },
  { id: 'graphite', name: 'Graphite', primary: '#27272A', hover: '#18181B', soft: '#EEEEF0', font: 'var(--font-geist-mono), ui-monospace, monospace' },
  { id: 'ocean', name: 'Ocean', primary: '#0E7490', hover: '#0B5C72', soft: '#E3F3F7', font: 'var(--font-geist-sans), system-ui, sans-serif' },
];

export const themeById = (id?: string) => APP_THEMES.find((t) => t.id === id) ?? APP_THEMES[0];

export interface Idea {
  title: string;
  pitch: string;
  timeSaved: string;
  prompt: string;
}

/** Ideas the AI Consultant falls back to when no AI key is set. */
export function cannedIdeas(role: string, bottleneck: string): Idea[] {
  const t = `${role} ${bottleneck}`.toLowerCase();
  if (/claim|insur|underwrit|broker/.test(t))
    return [
      { title: 'Claims triage assistant', pitch: 'Reads claim emails, checks the policy, flags risky claims and drafts replies.', timeSaved: '8 hours a week', prompt: PROMPT_LIBRARY[0].items[0].prompt },
      { title: 'Broker inbox helper', pitch: 'Sorts broker emails by urgency and drafts the routine answers.', timeSaved: '5 hours a week', prompt: PROMPT_LIBRARY[0].items[2].prompt },
      { title: 'Renewal reminders', pitch: 'Finds policies about to expire and drafts a personal reminder for each.', timeSaved: '3 hours a week', prompt: PROMPT_LIBRARY[0].items[1].prompt },
    ];
  if (/bank|kyc|onboard|compliance|dispute/.test(t))
    return [
      { title: 'KYC document check', pitch: 'Reads IDs and statements and lists what is missing.', timeSaved: '6 hours a week', prompt: PROMPT_LIBRARY[1].items[0].prompt },
      { title: 'Dispute case drafter', pitch: 'Turns a card dispute into a ready-to-review chargeback case.', timeSaved: '4 hours a week', prompt: PROMPT_LIBRARY[1].items[1].prompt },
      { title: 'Policy Q&A', pitch: 'Answers staff questions from internal policy and quotes the source.', timeSaved: '3 hours a week', prompt: PROMPT_LIBRARY[3].items[0].prompt },
    ];
  if (/nurse|patient|clinic|hospital|health/.test(t))
    return [
      { title: 'Patient intake', pitch: 'Turns intake forms into records and flags urgent symptoms.', timeSaved: '7 hours a week', prompt: PROMPT_LIBRARY[2].items[0].prompt },
      { title: 'Prior authorization', pitch: 'Checks requests against payer criteria and drafts the submission.', timeSaved: '5 hours a week', prompt: PROMPT_LIBRARY[2].items[1].prompt },
      { title: 'Policy Q&A', pitch: 'Answers staff questions from clinical policies and quotes the source.', timeSaved: '2 hours a week', prompt: PROMPT_LIBRARY[3].items[0].prompt },
    ];
  return [
    { title: 'Inbox triage', pitch: 'Sorts incoming requests by urgency and drafts the routine replies.', timeSaved: '5 hours a week', prompt: 'An inbox triage assistant that sorts incoming requests by urgency, answers routine ones, and drafts replies for the team to check.' },
    { title: 'Invoice checker', pitch: 'Matches invoices to purchase orders and flags mismatches.', timeSaved: '4 hours a week', prompt: PROMPT_LIBRARY[3].items[1].prompt },
    { title: 'Policy Q&A', pitch: 'Answers staff questions from your documents and quotes the source.', timeSaved: '3 hours a week', prompt: PROMPT_LIBRARY[3].items[0].prompt },
  ];
}
