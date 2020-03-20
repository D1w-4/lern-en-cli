import axiosFab, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { jiraEnv } from 'src/api/jira/env';
import { IssueModel } from 'src/api/jira/models';
import { config } from 'src/console-services/config';
import { log } from 'src/utils';

export class JiraTransport {
    private _axios: null | AxiosInstance;

    get axios(): AxiosInstance {
        if (!this._axios) {
            this.makeAxiosinstance()
        }

        return this._axios;
    }


    issue(issueId: string): Promise<IssueModel> {
        return this
            .axios
            .get(`${jiraEnv.apiUrl}/issue/${issueId}`)
            .then(resulst =>
                resulst.data
            );
    }

    makeAxiosinstance(axiosConfig: AxiosRequestConfig = {}) {
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        if (!config.jira || !config.jira.token) {
            log(`
=================================================================            
= Для работы с jira необходимо дабавить token доступа.          =
= ebash config jira --token                                     =
=================================================================
            `)
        }
        const headers = config.jira && config.jira.token ? {
            'Authorization': `Basic ${config.jira.token}`
        } : void 0;
        this._axios = axiosFab.create({
            ...axiosConfig,
            headers
        });
    }
}

export const jiraTransport = new JiraTransport();
