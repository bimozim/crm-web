export type CustomerStatus = "ACTIVE" | "INACTIVE";

export type Customer = {
    id: string;
    name: string;
    companyName: string | null;
    document: string | null;
    email: string | null;
    phone: string | null;
    status: CustomerStatus;
    createdAt: string;
    updatedAt: string;
};

export type CreateCustomerInput = {
    name: string;
    companyName: string;
    document: string;
    email: string;
    phone: string;
};

export type CustomerPage = {
    content: Customer[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
};

export type ApiError = {
    timestamp: string;
    status: number;
    error: string;
    message: string;
    path: string;
    fieldErrors: Record<string, string>;
};