export type Plan = "solo" | "pro";

export type ProposalStatus = "draft" | "sent" | "viewed" | "signed";

export interface Profile {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  plan: Plan | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  stripe_account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  created_at: string;
}

export interface Proposal {
  id: string;
  user_id: string;
  title: string;
  client_name: string | null;
  client_email: string | null;
  content: Record<string, unknown> | null;
  status: ProposalStatus;
  viewed_at: string | null;
  signed_at: string | null;
  deposit_amount: number | null; // cents
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  deposit_payment_intent: string | null;
  sent_at: string | null;
  auto_remind: boolean;
  reminders_sent: number;
  expires_on: string | null; // YYYY-MM-DD, last day it can be signed
  created_at: string;
  updated_at: string;
}

export interface Signature {
  id: string;
  proposal_id: string;
  signer_name: string;
  signer_email: string | null;
  signature_url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  signed_at: string;
}

export type TemplateCategory = "consulting" | "design" | "dev" | "marketing";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      proposals: {
        Row: Proposal;
        Insert: Partial<Proposal> & { user_id: string; title: string };
        Update: Partial<Proposal>;
      };
      signatures: {
        Row: Signature;
        Insert: Partial<Signature> & {
          proposal_id: string;
          signer_name: string;
        };
        Update: Partial<Signature>;
      };
    };
  };
}
