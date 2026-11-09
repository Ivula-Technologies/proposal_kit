import type { JSONContent } from "@tiptap/core";

import type { TemplateCategory } from "@/types";

// Built-in starter proposals. They ship with the app so a new account has
// real templates on day one, whether or not supabase/seed.sql was run.
// The proposal title is shown above the content on the client's page, so
// templates start at the first section rather than repeating it.

export interface BuiltInTemplate {
  key: string;
  name: string;
  category: TemplateCategory;
  description: string;
  content: JSONContent;
}

const text = (value: string, bold = false): JSONContent =>
  bold ? { type: "text", text: value, marks: [{ type: "bold" }] } : { type: "text", text: value };

const h2 = (value: string): JSONContent => ({
  type: "heading",
  attrs: { level: 2 },
  content: [text(value)],
});

const p = (...parts: (string | JSONContent)[]): JSONContent => ({
  type: "paragraph",
  content: parts.map((part) => (typeof part === "string" ? text(part) : part)),
});

const list = (items: (string | [string, string])[]): JSONContent => ({
  type: "bulletList",
  content: items.map((item) => ({
    type: "listItem",
    content: [
      typeof item === "string"
        ? p(item)
        : p(text(`${item[0]}: `, true), text(item[1])),
    ],
  })),
});

const doc = (...content: JSONContent[]): JSONContent => ({ type: "doc", content });

// A pricing table block. Prices start at $0 so nothing goes out with a
// made-up number: the editor warns before sending while any line is $0.
const pricing = (
  ...items: [id: string, name: string, description: string, optional?: boolean][]
): JSONContent => ({
  type: "pricingTable",
  attrs: {
    items: items.map(([id, name, description, optional = false]) => ({
      id,
      name,
      description,
      quantity: 1,
      unitPrice: 0,
      optional,
      selected: !optional,
    })),
  },
});

const NEXT_STEPS = [
  h2("Next steps"),
  p(
    "If this looks right, sign below. You'll get a signed copy by email, and I'll send a kickoff invite within one business day. Questions or changes? Reply to my email before signing and I'll update this proposal."
  ),
];

const TERMS = (payment: string) => [
  h2("Terms"),
  list([
    ["Payment", `${payment} Invoices are due within 14 days.`],
    ["Revisions", "Two rounds of revisions are included. Extra rounds or new scope are quoted before any work starts."],
    ["Ownership", "You own the final deliverables once the project is paid in full."],
    ["Timeline", "Dates assume feedback within two business days. Delays on either side move the dates by the same amount."],
    ["Cancellation", "Either side can end the project with written notice. Work completed to that date is billed, and the deposit is non-refundable."],
  ]),
];

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    key: "consulting",
    name: "Consulting engagement",
    category: "consulting",
    description: "Strategy, advisory or fractional work billed as a project",
    content: doc(
      p("Hi [Client name], thanks for the time on our call. Here's how I'd help [company] reach [goal], what it costs, and how we'd work together."),
      h2("Where you are today"),
      p("[Two or three sentences in the client's own words: the problem, why it matters now, and what happens if nothing changes.]"),
      h2("What we'll do"),
      list([
        ["Discovery (week 1)", "Interviews with [team/stakeholders] and a review of [data, tools, process]."],
        ["Recommendations (weeks 2-3)", "A prioritized plan with owners, costs and expected impact."],
        ["Rollout support (weeks 4-6)", "Weekly working sessions to put the top priorities in place."],
      ]),
      h2("What you'll get"),
      list([
        "A written findings report and a 60-minute readout with your team",
        "A 90-day action plan you can run without me",
        "Email and Slack support for the length of the engagement",
      ]),
      h2("Investment"),
      pricing(
        ["fee", "Consulting engagement", "Discovery, recommendations and 3 weeks of rollout support, fixed fee"],
        ["extra", "Extra month of rollout support", "Weekly working sessions for 4 more weeks", true]
      ),
      list([
        ["Deposit", "50% on signing, so we can book the start date"],
        ["Balance", "50% when the action plan is delivered"],
      ]),
      ...TERMS("50% deposit to book the project, the balance on delivery."),
      ...NEXT_STEPS
    ),
  },
  {
    key: "design",
    name: "Design project",
    category: "design",
    description: "Brand, website or product design with clear rounds",
    content: doc(
      p("Hi [Client name], here's the plan for [project], based on what you shared about [audience and goal]."),
      h2("Goals"),
      list([
        "[Goal one, e.g. a brand that feels premium to first-time buyers]",
        "[Goal two, e.g. a homepage that turns visitors into booked calls]",
      ]),
      h2("Scope"),
      list([
        ["Research and direction", "Mood boards and two creative directions to choose from."],
        ["Design", "[Logo suite / 5 page designs / app screens] in the direction you pick."],
        ["Handoff", "Final files, a one-page style guide and a walkthrough call."],
      ]),
      h2("Timeline"),
      list([
        ["Week 1", "Kickoff and directions"],
        ["Weeks 2-3", "Design and first round of feedback"],
        ["Week 4", "Final revisions and handoff"],
      ]),
      h2("Investment"),
      pricing(
        ["fee", "Design project", "Research, two directions, final design and handoff"],
        ["round", "Extra revision round", "One more round of changes after the final review", true]
      ),
      list([
        ["Deposit", "50% on signing"],
        ["Balance", "50% at handoff"],
      ]),
      ...TERMS("50% deposit to book the project, the balance on delivery."),
      ...NEXT_STEPS
    ),
  },
  {
    key: "dev",
    name: "Web or software build",
    category: "dev",
    description: "Websites, apps and integrations with milestones",
    content: doc(
      p("Hi [Client name], here's how I'd build [project], what's included, and what it costs."),
      h2("What we're building"),
      p("[One paragraph on what the finished product does for the business, in plain language.]"),
      h2("Scope"),
      list([
        ["Pages or features", "[List them, e.g. home, services, booking, contact, blog]"],
        ["Integrations", "[e.g. Stripe, Calendly, HubSpot, Google Analytics]"],
        ["Content", "[Who provides copy and images, and by when]"],
        ["Launch", "Hosting setup, domain, SSL and a launch checklist"],
      ]),
      h2("Not included"),
      p("[Anything you want to be clear about, e.g. copywriting, ongoing SEO, or app store fees. These can be added later as a separate quote.]"),
      h2("Milestones"),
      list([
        ["Milestone 1", "Wireframes and approved plan ([date])"],
        ["Milestone 2", "Working build on a preview link ([date])"],
        ["Milestone 3", "Launch and 30 days of bug fixes ([date])"],
      ]),
      h2("Investment"),
      pricing(
        ["build", "Build and launch", "Everything in the scope above, through launch and 30 days of fixes"],
        ["care", "Care plan, first 3 months", "Updates, backups and small changes after launch", true]
      ),
      list([
        ["Deposit", "40% on signing"],
        ["Then", "30% at milestone 2 and 30% at launch"],
      ]),
      ...TERMS("40% deposit to book the project, then 30% at each of the next two milestones."),
      ...NEXT_STEPS
    ),
  },
  {
    key: "marketing",
    name: "Monthly retainer",
    category: "marketing",
    description: "Marketing, social, SEO or any ongoing monthly service",
    content: doc(
      p("Hi [Client name], here's a monthly plan to grow [channel or metric] for [company]."),
      h2("Goals for the first 90 days"),
      list([
        "[e.g. Double qualified leads from organic search]",
        "[e.g. Post 3 times a week on LinkedIn and Instagram]",
      ]),
      h2("Every month you get"),
      list([
        "[Deliverable one, e.g. 12 social posts designed and scheduled]",
        "[Deliverable two, e.g. 2 SEO blog posts]",
        "A monthly report and a 30-minute review call",
      ]),
      h2("Investment"),
      pricing(
        ["retainer", "Monthly retainer", "Everything listed above, billed on the 1st of each month"],
        ["ads", "Paid ads management", "Set up and run campaigns each month (ad spend billed separately)", true]
      ),
      list([
        ["First month", "Paid on signing as the deposit"],
        ["Commitment", "3 months to start, then month to month with 30 days' notice"],
      ]),
      h2("Terms"),
      list([
        ["Payment", "The first month is paid on signing. Each later month is invoiced on the 1st and due within 7 days."],
        ["Changes", "Deliverables can be swapped month to month as long as the total effort stays the same."],
        ["Ad spend", "Ad budgets and paid tools are billed to your own accounts, not included in the retainer."],
        ["Ownership", "Content and accounts we create are yours."],
        ["Cancellation", "After the first 3 months, either side can cancel with 30 days' written notice."],
      ]),
      ...NEXT_STEPS
    ),
  },
  {
    key: "service-agreement",
    name: "Service agreement",
    category: "contract",
    description: "A plain-English contract for any freelance project, signed online",
    content: doc(
      p("This agreement is between [Your business name] (\"I\", \"me\") and [Client company] (\"you\"). It covers the work described below and starts on the date you sign."),
      h2("1. The work"),
      p("I will provide: [describe the services and deliverables, in plain language]."),
      p("Anything not listed here is outside this agreement. New work is quoted in writing before it starts."),
      h2("2. Fees and payment"),
      pricing(["fee", "Services", "The work described in section 1"]),
      list([
        ["Deposit", "[50]% is due on signing. Work starts once it is paid."],
        ["Balance", "Invoiced on delivery and due within 14 days."],
        ["Late payment", "If an invoice is more than 14 days late, I can pause work until it is paid."],
        ["Expenses", "Pre-approved expenses (stock assets, software, travel) are billed at cost."],
      ]),
      h2("3. Timeline and feedback"),
      p("We aim to finish by [date]. You agree to send feedback and materials within [2] business days of a request. Delays on either side move the dates by the same amount."),
      h2("4. Changes"),
      p("[Two] rounds of revisions are included. Extra rounds or changes to the scope are quoted in writing, and the dates and fees change only if you agree."),
      h2("5. Ownership"),
      p("Once you have paid in full, you own the final deliverables. I keep ownership of my tools, templates, code libraries and know-how, and give you a permanent licence to use any of them that are part of the deliverables. I may show the finished work in my portfolio unless you ask me not to in writing."),
      h2("6. Confidentiality"),
      p("Each of us will keep the other's non-public information private and use it only for this project. This does not cover information that is already public or that the law requires us to share."),
      h2("7. Independent contractor"),
      p("I work as an independent contractor, not an employee. I am responsible for my own taxes, insurance and equipment."),
      h2("8. Warranties and liability"),
      p("I will do the work in a professional way. Neither of us is liable for indirect or consequential losses, and my total liability under this agreement is limited to the fees you paid me under it."),
      h2("9. Ending this agreement"),
      p("Either of us can end this agreement with [14] days' written notice. You pay for work completed up to that date, and the deposit is non-refundable. Sections 5, 6 and 8 continue after it ends."),
      h2("10. General"),
      p("This agreement is governed by the laws of [State]. It is the whole agreement between us, and changes must be in writing. Signing online has the same effect as signing on paper."),
      p(text("Before you rely on this template, have a lawyer in your state review it. It is a starting point, not legal advice.", true))
    ),
  },
  {
    key: "nda",
    name: "Mutual NDA",
    category: "contract",
    description: "A short two-way non-disclosure agreement to sign before a project",
    content: doc(
      p("This mutual non-disclosure agreement is between [Your business name] and [Client company]. Each of us may share confidential information with the other while we discuss [purpose, e.g. a possible website project]."),
      h2("1. What counts as confidential"),
      p("Any non-public business, technical or financial information one of us shares with the other, in writing or out loud, that a reasonable person would understand to be confidential."),
      h2("2. What it does not cover"),
      list([
        "Information that is public, or becomes public through no fault of the person who received it",
        "Information the receiver already knew or developed on their own",
        "Information the receiver got lawfully from someone else",
        "Information the law or a court requires the receiver to share, after telling the other side where allowed",
      ]),
      h2("3. What each of us agrees to"),
      list([
        "Use the other's information only for the purpose above",
        "Share it only with people who need it for that purpose and who are bound to keep it private",
        "Protect it with at least the same care we use for our own confidential information",
        "Return or delete it when asked",
      ]),
      h2("4. How long it lasts"),
      p("This agreement starts on the date it is signed. The duty to keep information confidential lasts for [2] years after the last disclosure, and for trade secrets, for as long as they stay trade secrets."),
      h2("5. General"),
      p("Nothing here obliges either of us to share information or to work together. This agreement is governed by the laws of [State]. Signing online has the same effect as signing on paper."),
      p(text("Before you rely on this template, have a lawyer in your state review it. It is a starting point, not legal advice.", true))
    ),
  },
];

export function builtInTemplate(key: unknown) {
  return BUILT_IN_TEMPLATES.find((template) => template.key === key) ?? null;
}
