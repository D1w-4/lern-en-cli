import axiosFab, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { log } from 'src/utils';
import { config } from './../../console-services/config';
import { stashEnv } from './env';
import { CommitModel, RepositoryModel } from './models';

interface IStashPagination<T> {
    isLastPage: boolean
    nextPageStart: number,
    values: T,
}

export class StashTransport {
    private _axios: null | AxiosInstance;

    get axios(): AxiosInstance {
        if (!this._axios) {
            this.makeAxiosinstance()
        }

        return this._axios;
    }

    private async fetchAllPage<T>(
        fn: (config: AxiosRequestConfig) => Promise<AxiosResponse<IStashPagination<T>>>,
        config: AxiosRequestConfig = {}
    ): Promise<Array<T>> {
        const result = [];
        await fn(config).then((response) => {
            result.push(response.data.values);
            if (!response.data.isLastPage) {
                const mergeConfig = {
                    ...config,
                    params: {
                        ...(config.params || {}
                        ),
                        start: response.data.nextPageStart,
                        limit: 100
                    }
                };
                return this.fetchAllPage(fn, mergeConfig).then((data) => {
                    result.push(...data);
                    return result;
                });
            }
        });

        return result;
    }

    fetchChangesInCommit(projectName: string, repoName: string, commitId: string): Promise<Array<any>> {
        const fn = (config) => {
            return this.axios.get(
                `${stashEnv.apiUrl}/projects/${projectName}/repos/${repoName}/commits/${commitId}/changes`,
                config
            )
        };
        return this.fetchAllPage<string>(fn).then(results => {
            return results.reduce((acc, value) => {
                acc.push(...value);
                return acc;
            }, [])
        });
    }

    fetchCommits(projectName: string, repoName: string, branch: string): Promise<Array<CommitModel>> {
        const fn = (config) => {
            return this.axios.get(`${stashEnv.apiUrl}/projects/${projectName}/repos/${repoName}/commits`, config)
        };
        return this.fetchAllPage<string>(fn, {
            params: {
                until: branch
            }
        }).then(results => {
            return results.reduce((acc, value) => {
                acc.push(...value);
                return acc;
            }, [])
        });
    }

    fetchListRepo(projectName: string): Promise<Array<RepositoryModel>> {
        const fn = (config: AxiosRequestConfig) => {
            return this.axios.get(`${stashEnv.apiUrl}/projects/${projectName}/repos`, config)
        };

        return this.fetchAllPage<Array<RepositoryModel>>(fn).then((result) => {
            return result.reduce((acc, value) => {
                acc.push(...value);
                return acc;
            }, []);
        });
    }

    fetchRawFile<T = string>(project: string, repoName: string, filePath, branch: string): Promise<T> {
        return this.axios
                   .get(`${stashEnv.apiUrl}/projects/${project}/repos/${repoName}/raw/${filePath}`, {
                       params: {
                           at: branch
                       }
                   })
                   .then(resp => {
                       return resp.data;
                   });
    }

    fetchRepoFiles(
        projectName: string,
        repoName: string,
        branch: string
    ): Promise<Array<string>> {
        const fn = (config) => {
            return this.axios.get(`${stashEnv.apiUrl}/projects/${projectName}/repos/${repoName}/files`, config)
        };
        return this.fetchAllPage<string>(fn, {
            params: {
                at: branch
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
        if (!config.stash || !config.stash.token) {
            log(`
=================================================================            
= Для работы со stash необходимо добавить token доступа.        =
= https://stash.bank24.int/plugins/servlet/access-tokens/manage =
= ebash config stash --token e123as234                          =
=================================================================
            `)
        }
        const headers = config.stash && config.stash.token ? {
            Authorization: `Bearer ${config.stash.token}`
        } : void 0;
        this._axios = axiosFab.create({
            ...axiosConfig,
            headers
        });
    }
}

export const stashTransport = new StashTransport();
