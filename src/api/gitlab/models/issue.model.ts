export interface IAssigne {
    id: number;
    name: string;
    username: string;
}

export class IssueModel {
    assignee: IAssigne;
    assignees: Array<IAssigne>;
    author: {
        id: number;
        username: string;
        name: string;
    };
    created_at: string;
    closed_at: string;
    id: number;
    project_id: number;
    state: 'opened' | 'closed';
    merge_requests_count: number;
    title: string;
    updated_at: string;
}
