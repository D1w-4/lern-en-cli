import { stashTransport } from 'src/api/stash';
import { CommitModel } from 'src/api/stash/models';

export class CommitByDate {
    async byDate(from: string, to: string, repoName, branch): Promise<{ from: string, to: string } | null> {
        const result = await this.fetchCommit(repoName, branch);
        const fromT = new Date(from).getTime();
        const toT = new Date(to).getTime();
        const date = result.filter(({ authorTimestamp }) => {
            return authorTimestamp <= toT && authorTimestamp >= fromT;
        });
        if (date.length < 2) {
            return null;
        }

        return {
            to: date.shift().id,
            from: date.pop().id
        };
    }

    async fetchCommit(repoName: string, branch: string): Promise<Array<CommitModel>> {
        return await stashTransport.fetchCommits('T15', repoName, branch);
    }
}

export const commitByDate = new CommitByDate();
