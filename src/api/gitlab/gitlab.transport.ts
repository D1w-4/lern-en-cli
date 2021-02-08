import axiosFab, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { gitlabEnv } from 'src/api/gitlab/env';
import { IssueModel } from 'src/api/gitlab/models';

import { config } from 'src/console-services/config';
import { log } from 'src/utils';

export class GitlabTransport {
    private _axios: null | AxiosInstance;

    get axios(): AxiosInstance {
        if (!this._axios) {
            this.makeAxiosinstance();
        }

        return this._axios;
    }

    private async fetchAllPage<T>(
        fn: (config: AxiosRequestConfig) => Promise<AxiosResponse<T>>,
        map: (result) => T,
        config: AxiosRequestConfig = {}
    ): Promise<Array<T>> {
        const result = [];
        const mergeConfig = {
            ...config,
            params: {
                ...(config.params || {}
                ),
                per_page: 100
            }
        };
        await fn(mergeConfig).then((response) => {
            result.push(map(response));
            const nextPage = response.headers['x-next-page'];
            if (nextPage) {
                mergeConfig.params.page = nextPage;
                return this.fetchAllPage(fn, map, mergeConfig).then((data) => {
                    result.push(...data);
                    return result;
                });
            }
        });

        return result;
    }

    issues(projectId: number, state: 'closed' | 'opened' | 'all'): Promise<Array<IssueModel>> {
        const fn = (config) => {
            return this.axios
                       .get(`${gitlabEnv.apiUrl}/projects/${projectId}/issues`, config)
        };

        return this.fetchAllPage(fn, resp => resp.data, {
            params: {
                state
            }
        }).then(results => {
            return results.reduce((acc, value) => {
                acc.push(...value);
                return acc;
            }, [])
        });
    }

    makeAxiosinstance(axiosConfig: AxiosRequestConfig = {}) {
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        if (!config.gitlab || !config.gitlab.token) {
            log(`
=================================================================            
= Для работы с gitlab необходимо добавить token доступа.        =
= https://gitlab.tochka-tech.com/profile/personal_access_tokens =
= ebash config gitlab --token e123as234                         =
=================================================================
            `)
        }
        const headers = config.gitlab && config.gitlab.token ? {
            'Private-Token': `${config.gitlab.token}`
        } : void 0;
        this._axios = axiosFab.create({
            ...axiosConfig,
            headers
        });
    }

    relatedMergeRequests(projectId: string, issueId: number): Promise<Array<any>> {
        return this.axios
                   .get(`${gitlabEnv.apiUrl}/projects/${projectId}/issues/283/related_merge_requests`)
                   .then(resp => resp.data)
    }
}

export const gitlabTransport = new GitlabTransport();

