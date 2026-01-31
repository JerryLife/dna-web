/** Shared types for Community Lab (ProposeModelForm + ResearchQueue) */

export type ProposalStatus = 'pending' | 'scanning' | 'completed' | 'failed';

export interface Proposal {
  id: string;
  modelId: string;
  reason?: string;
  submitter: string;
  votes: number;
  voted?: boolean;
  status: ProposalStatus;
  createdAt: string;
}

export type SortBy = 'votes' | 'recent' | 'name';
