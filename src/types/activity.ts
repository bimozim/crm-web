export type ActivityType =
    | "CALL"
    | "MEETING"
    | "TASK"
    | "FOLLOW_UP";

export type ActivityStatus =
    | "PENDING"
    | "COMPLETED"
    | "CANCELED";

export type Activity = {
    id: string;
    customerId: string | null;
    customerName: string | null;
    opportunityId: string | null;
    opportunityTitle: string | null;
    title: string | null;
    description: string | null;
    type: ActivityType;
    status: ActivityStatus;
    scheduledAt: string;
    hasTime: boolean;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type CreateActivityInput = {
    customerId: string | null;
    opportunityId: string | null;
    title: string;
    description: string;
    type: ActivityType;
    scheduledAt: string;
    hasTime: boolean;
};
