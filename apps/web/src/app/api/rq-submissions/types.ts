export type SubmissionPayload = {
  source?: string;
  submittedAt?: string;
  brand?: {
    company?: string;
    acronym?: string;
    title?: string;
  };
  basics?: {
    type?: string;
    first?: string;
    last?: string;
    role?: string;
    org?: string;
    industry?: string;
    website?: string;
    email?: string;
  };
  answers?: Record<string, unknown>;
  result?: {
    rq?: string;
    rqName?: string;
    profile?: unknown;
    details?: unknown;
    clarity?: {
      label?: string;
      note?: string;
      [key: string]: unknown;
    };
    undertone?: string;
  };
  meta?: {
    pageUrl?: string;
    referrer?: string;
    userAgent?: string;
  };
};
