/**
 * Exportable React Components for Earn Dashboard Integration
 *
 * These components can be imported into the earn-service sponsor dashboard
 * to display GitHub auto-review results.
 *
 * Usage:
 * import { GitHubReviewPanel, ReviewScoreBadge } from '@superteam/github-autoreview/components/earn';
 */

export { GitHubReviewPanel } from './GitHubReviewPanel';
export { ReviewScoreBadge } from './ReviewScoreBadge';
export { ReviewDetailModal } from './ReviewDetailModal';
export { ReviewLabelsDisplay } from './ReviewLabelsDisplay';

// Types for integration
export type { GitHubReviewData, EarnLabel, ReviewPanelProps } from './types';
