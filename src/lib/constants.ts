import type { BlockId, Status } from './types';

export const SUBMISSION_TYPES = [
  { id: 'profile-creation', name: 'Profile Creation' },
  { id: 'social-bookmarking', name: 'Social Bookmarking' },
  { id: 'directory-submission', name: 'Directory Submission' },
  { id: 'classified-submission', name: 'Classified Submission' },
  { id: 'blog-submission', name: 'Blog Submission' },
  { id: 'article-submission', name: 'Article Submission' },
  { id: 'image-submission', name: 'Image Submission' },
  { id: 'pdf-submission', name: 'PDF Submission' },
  { id: 'infographics-submission', name: 'Infographics Submission' },
  { id: 'video-sharing', name: 'Video Sharing' },
  { id: 'story-sharing', name: 'Story Sharing' },
  { id: 'web-2-0', name: 'Web 2.0' },
  { id: 'wiki-submission', name: 'Wiki Submission' },
  { id: 'forum-posting', name: 'Forum Posting' },
  { id: 'press-release', name: 'Press Release' },
  { id: 'rss-feed', name: 'RSS Feed' },
  { id: 'ping-submission', name: 'Ping Submission' },
  { id: 'search-engine-submission', name: 'Search Engine Submission' },
  { id: 'social-networking', name: 'Social Networking' },
  { id: 'business-networking', name: 'Business Networking' },
  { id: 'portfolio-website', name: 'Portfolio Website' },
  { id: 'showcase-sites', name: 'Showcase Sites' },
  { id: 'seo-audit-tools', name: 'SEO Audit Tools' },
  { id: 'gov-sites', name: '.Gov Sites' },
] as const;

export const TYPE_NAME: Record<string, string> = Object.fromEntries(
  SUBMISSION_TYPES.map((t) => [t.id, t.name]),
);

export const BLOCKS: { id: BlockId; name: string; color: string }[] = [
  { id: 'seo', name: 'SEO', color: 'var(--c-seo)' },
  { id: 'smm', name: 'Social Media', color: 'var(--c-smm)' },
  { id: 'sem', name: 'Ads / SEM', color: 'var(--c-sem)' },
  { id: 'ops', name: 'Analytics & Ops', color: 'var(--c-ops)' },
];
export const BLOCK_IDS = BLOCKS.map((b) => b.id);
export const BLOCK_NAME: Record<string, string> = Object.fromEntries(BLOCKS.map((b) => [b.id, b.name]));
export const BLOCK_COLOR: Record<string, string> = Object.fromEntries(BLOCKS.map((b) => [b.id, b.color]));

export const FREQUENCIES = ['Daily', 'Alt Days', 'Weekly', 'Monthly', 'One-Time', 'Random'] as const;

export type Tone = 'idle' | 'warn' | 'ok' | 'bad' | 'accent';
export const STATUS_ORDER: Status[] = ['pend', 'prog', 'done', 'block'];
export const STATUS_META: Record<Status, { label: string; tone: Tone }> = {
  pend: { label: 'Pending', tone: 'idle' },
  prog: { label: 'In progress', tone: 'warn' },
  done: { label: 'Done', tone: 'ok' },
  block: { label: 'Blocked', tone: 'bad' },
};

/** The standard monthly retainer plan — offered as a starting template. */
export const PLAN_TEMPLATE: [BlockId, string, string, number, string, string][] = [
  ['seo', 'Weekly', 'Blog articles (2 per week)', 480, '~2 hrs/blog', 'Keyword-focused, SEO-optimised'],
  ['seo', 'Daily', 'Link building — 30 SB, 2 classified, 2 directory, 2 blog', 2340, '1.5 hrs/day', '30 min per task type'],
  ['seo', 'Weekly', 'On-page SEO', 420, '1 hr/page', 'Target services, FAQs'],
  ['seo', 'Random', 'GMB optimisation & review response', 90, '20–30 min', 'Update info, post & reply to reviews'],
  ['seo', 'Monthly', 'Keyword strategy + tracker update', 120, '2 hrs', 'Adjust targeting per blog/service'],
  ['seo', 'Weekly', 'Competitor SEO & content analysis', 60, '1 hr', 'Backlink gap, ranking movement'],
  ['seo', 'Monthly', 'SEO report (GA, GSC, rankings)', 150, '2.5 hrs', 'Top keywords, CTR, bounce'],
  ['smm', 'Alt Days', 'Feed posts (3 per week)', 720, '1 hr/post', 'FB, IG, LinkedIn'],
  ['smm', 'Weekly', 'Reels (2 per week)', 480, '2 hrs/reel', 'Editing + captions — FB/IG'],
  ['smm', 'Alt Days', 'Stories (8 per month)', 240, '15–20 min/day', 'Reposts, offers, behind the scenes'],
  ['smm', 'Weekly', 'Pinterest pins (2 per week)', 120, '1 hr/week', 'Blog covers, before/after'],
  ['smm', 'Weekly', 'Quora answers (2 per week)', 120, '1 hr/week', 'Niche questions with backlinks'],
  ['smm', 'Random', 'YouTube Shorts / before-after video', 180, '3 hrs', 'Monthly wrap or promo'],
  ['smm', 'Weekly', 'Competitor SMM review', 60, '1 hr', 'Post types, formats, engagement'],
  ['smm', 'Monthly', 'Campaign design (poster + 1 reel)', 120, '2 hrs', 'Promo days and offers'],
  ['smm', 'Monthly', 'Design templates (post + reel)', 240, '~2 sessions', 'Base templates'],
  ['smm', 'Monthly', 'Content calendar planning', 180, '3 hrs', 'Theme planning, platform split'],
  ['smm', 'Monthly', 'SMM insights report', 150, '2.5 hrs', 'Reach, engagement, top content'],
  ['sem', 'One-Time', 'Google Ads setup + conversion goals', 120, '2 hrs', 'Includes Tag Manager setup'],
  ['sem', 'Weekly', 'Monitor active campaigns', 480, '2 hrs/week', 'CPC, CTR, bounce'],
  ['sem', 'Monthly', 'Keyword lists + sample ads', 180, '3 hrs', 'By service category'],
  ['sem', 'Weekly', 'Ad objectives / creative trends', 240, '1 hr/week', 'Google & Meta updates'],
  ['sem', 'Weekly', 'Competitor ads review', 120, '30 min/week', 'Meta Ads Library, Google preview'],
  ['sem', 'Monthly', 'Keyword & ad split-test plan', 300, '5 hrs', 'Two ad variations'],
  ['ops', 'Weekly', 'Google Analytics + Search Console checks', 240, '1 hr/week', 'Traffic, bounce, indexing'],
  ['ops', 'Monthly', 'Combined SEO / SMM / SEM report', 180, '3 hrs', 'Charts, traffic-source insight'],
  ['ops', 'Monthly', 'Drive + creative folder cleanup', 120, '2 hrs', 'Archive, organise assets'],
  ['ops', 'Weekly', 'Lead / form check + backup', 240, '1 hr/week', 'Export leads from forms'],
  ['ops', 'Monthly', 'Strategy sync / review session', 120, '2 hrs', 'Plan next month from insights'],
  ['ops', 'Random', 'Upskilling / trend R&D', 240, '~1 hr/session', 'Platform and algorithm shifts'],
];
