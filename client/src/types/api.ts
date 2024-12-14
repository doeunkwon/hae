export interface ChatResponse {
    response: string;
}

export interface SaveResponse {
    message: string;
}

export interface ApiError {
    detail: string;
} 

export interface Message {
    role: "user" | "assistant";
    content: string;
}

export interface Network {
    nid: number;
    name: string;
}

export interface Content {
    cid: number;
    content: string;
    created_at: string;
}