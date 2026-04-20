// Goal hints, format archetypes, and CTA presets drive the voice, structure,
// and closer of the generated draft. Goal is free-text so users can express
// both identity and purpose in one line. Format and CTA are chips with
// curated prompt fragments.

export const GOAL_HINTS: readonly string[] = [
  "I'm a founder building in public. I want to be known for honest takes on the messy parts of shipping.",
  "I'm a founder building thought leadership in AI product strategy.",
  "I'm a designer at a seed-stage startup. I want to share craft and process, not hot takes.",
  "I'm an engineer who writes about distributed systems. I want to help early-career engineers level up.",
  "I'm an indie hacker building solo. I want to attract my first 100 paying users without selling hard.",
  "I'm an operator running a content team. I want to share what actually moved the numbers.",
];

export type FormatId =
  | "story"
  | "contrarian"
  | "framework"
  | "build-in-public"
  | "question";

export interface FormatPreset {
  id: FormatId;
  label: string;
  tagline: string;
  systemFragment: string;
}

export const FORMAT_PRESETS: readonly FormatPreset[] = [
  {
    id: "story",
    label: "Story",
    tagline: "Hook → scene → turn → lesson",
    systemFragment: `Structure as a short story. Open with a one-line hook that makes the reader want to see what happened. Paint a quick scene with one or two concrete details. Reveal the turn or insight. Close with the lesson — short, memorable, not preachy. Short paragraphs (1-2 sentences each) for mobile reading.`,
  },
  {
    id: "contrarian",
    label: "Contrarian take",
    tagline: "Everyone says X; the real answer is Y",
    systemFragment: `Structure as a contrarian take. Open by naming the consensus view directly. Then break it — specifically and without hedging. Support the counter-position with one or two concrete reasons. Avoid strawman framings; steelman the consensus before dismantling it.`,
  },
  {
    id: "framework",
    label: "Framework / list",
    tagline: "Structured takeaways the reader can apply",
    systemFragment: `Structure as a framework or list. Open with a one-line setup that establishes the problem or question. Then present 3-5 numbered or bulleted points, each one tight and self-contained. Each bullet should stand on its own — avoid dependencies between items.`,
  },
  {
    id: "build-in-public",
    label: "Build-in-public",
    tagline: "Here's what I'm shipping / learning",
    systemFragment: `Structure as a build-in-public update. Start with what you shipped, tried, or noticed recently (concretely). Share what you learned — especially if it was surprising or went against your initial plan. Stay honest about what you don't know.`,
  },
  {
    id: "question",
    label: "Question / conversation-starter",
    tagline: "Open-ended, invites replies",
    systemFragment: `Structure as a question or conversation-starter. Open by framing the tension or dilemma clearly. Share your current thinking, but leave room for the reader to disagree. The post should feel like someone thinking out loud, not seeking validation.`,
  },
];

export type CtaId =
  | "none"
  | "comments"
  | "link"
  | "soft-sell"
  | "connect";

export interface CtaPreset {
  id: CtaId;
  label: string;
  tagline: string;
  systemFragment: string;
}

export const CTA_PRESETS: readonly CtaPreset[] = [
  {
    id: "none",
    label: "None",
    tagline: "Let the insight stand",
    systemFragment: `End on the insight itself. No call-to-action, no question bait, no "thoughts?" or "what do you think?". Let the post land on its own.`,
  },
  {
    id: "comments",
    label: "Invite comments",
    tagline: "Genuine question, specific enough to answer",
    systemFragment: `End with a specific, genuine question that invites readers' own experience or opinion. It should be concrete enough that someone answering has to bring a real perspective. Avoid "thoughts?" — too vague to spark useful replies.`,
  },
  {
    id: "link",
    label: "Link in comments",
    tagline: "Drive clicks without demotion",
    systemFragment: `End with a short "link in the comments" nudge for readers who want the full piece or resource. LinkedIn's algorithm demotes posts with external URLs inline, so never put the URL in the post body — only the nudge to check the comments.`,
  },
  {
    id: "soft-sell",
    label: "Soft sell",
    tagline: "Natural mention, low pressure",
    systemFragment: `End with a natural, low-pressure mention of what the writer is building or offering that genuinely connects to the topic. Avoid pitch-y language like "Book a call!" or "DM me to learn more!". "If you're working on X, that's what we help with" is the right register.`,
  },
  {
    id: "connect",
    label: "Call for connection",
    tagline: "Recruiting, collaborators, or clients",
    systemFragment: `End with a clear invitation to connect: hiring, looking for collaborators, clients, or conversations. Be specific about who you want to hear from and what you're after — vague "let's connect" invitations get ignored.`,
  },
];

export function getFormatPreset(id: string): FormatPreset | undefined {
  return FORMAT_PRESETS.find((f) => f.id === id);
}

export function getCtaPreset(id: string): CtaPreset | undefined {
  return CTA_PRESETS.find((c) => c.id === id);
}
