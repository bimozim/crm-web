import type {
    Activity,
    ActivityStatus,
    CreateActivityInput,
} from "@/types/activity";
import type {
    ApiError,
    CreateCustomerInput,
    Customer,
    CustomerPage,
} from "@/types/customer";
import type {
    CreateOpportunityInput,
    Opportunity,
    OpportunityStage,
} from "@/types/opportunity";

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8080/api/v1";

export class ApiRequestError extends Error {
    status: number;
    fieldErrors: Record<string, string>;

    constructor(apiError: ApiError) {
        super(apiError.message);

        this.name = "ApiRequestError";
        this.status = apiError.status;
        this.fieldErrors = apiError.fieldErrors ?? {};
    }
}

async function request<T>(
    path: string,
    options?: RequestInit,
): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const apiError = (await response.json()) as ApiError;

        throw new ApiRequestError(apiError);
    }

    return response.json() as Promise<T>;
}

// Clientes

export function getCustomers(
    search = "",
): Promise<CustomerPage> {
    const query = new URLSearchParams();

    if (search.trim()) {
        query.set("search", search.trim());
    }

    const suffix =
        query.size > 0 ? `?${query.toString()}` : "";

    return request<CustomerPage>(`/customers${suffix}`);
}

export function getCustomer(
    id: string,
): Promise<Customer> {
    return request<Customer>(`/customers/${id}`);
}

export function createCustomer(
    customer: CreateCustomerInput,
): Promise<Customer> {
    return request<Customer>("/customers", {
        method: "POST",
        body: JSON.stringify(customer),
    });
}

export function updateCustomer(
    id: string,
    customer: CreateCustomerInput,
): Promise<Customer> {
    return request<Customer>(`/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(customer),
    });
}

export function activateCustomer(
    id: string,
): Promise<Customer> {
    return request<Customer>(`/customers/${id}/activate`, {
        method: "PATCH",
    });
}

export function deactivateCustomer(
    id: string,
): Promise<Customer> {
    return request<Customer>(`/customers/${id}/deactivate`, {
        method: "PATCH",
    });
}

// Oportunidades

export function getOpportunities(): Promise<Opportunity[]> {
    return request<Opportunity[]>("/opportunities");
}

export function createOpportunity(
    opportunity: CreateOpportunityInput,
): Promise<Opportunity> {
    return request<Opportunity>("/opportunities", {
        method: "POST",
        body: JSON.stringify(opportunity),
    });
}

export function updateOpportunity(
    id: string,
    opportunity: CreateOpportunityInput,
): Promise<Opportunity> {
    return request<Opportunity>(`/opportunities/${id}`, {
        method: "PUT",
        body: JSON.stringify(opportunity),
    });
}

export function moveOpportunity(
    id: string,
    stage: OpportunityStage,
): Promise<Opportunity> {
    return request<Opportunity>(`/opportunities/${id}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage }),
    });
}

// Atividades

export function getActivities(
    status?: ActivityStatus,
): Promise<Activity[]> {
    const query = status ? `?status=${status}` : "";

    return request<Activity[]>(`/activities${query}`);
}

export function getActivity(
    id: string,
): Promise<Activity> {
    return request<Activity>(`/activities/${id}`);
}

export function createActivity(
    activity: CreateActivityInput,
): Promise<Activity> {
    return request<Activity>("/activities", {
        method: "POST",
        body: JSON.stringify(activity),
    });
}

export function completeActivity(
    id: string,
): Promise<Activity> {
    return request<Activity>(`/activities/${id}/complete`, {
        method: "PATCH",
    });
}

export function cancelActivity(
    id: string,
): Promise<Activity> {
    return request<Activity>(`/activities/${id}/cancel`, {
        method: "PATCH",
    });
}

export function reopenActivity(
    id: string,
): Promise<Activity> {
    return request<Activity>(`/activities/${id}/reopen`, {
        method: "PATCH",
    });
}
