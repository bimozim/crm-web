export type OpportunityStage =
    | "LEAD"
    | "CONTACTED"
    | "PROPOSAL"
    | "NEGOTIATION"
    | "WON"
    | "LOST";

export type Opportunity = {
    id: string;
    customerId: string;
    customerName: string;
    title: string;
    value: number;
    stage: OpportunityStage;
    expectedCloseDate: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
};

export type CreateOpportunityInput = {
    customerId: string;
    title: string;
    value: number;
    expectedCloseDate: string | null;
    notes: string;
};