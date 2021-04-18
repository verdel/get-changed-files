import * as github from "@actions/github"

export interface CompareCommitsOptions {
  owner: string
  repo: string
  base: string
  head: string
}

export interface IsDirectoryExistOptions {
  owner: string
  repo: string
  ref: string
  path: string
}

export interface File {
  filename: string
  status: string
  previous_filename?: string
}

export interface GitHubAPI {
  compareCommits(
    // eslint-disable-next-line no-unused-vars
    opts: CompareCommitsOptions
  ): Promise<{
    data: {
      files: Array<File>
    }
  }>

  // eslint-disable-next-line no-unused-vars
  isDirectoryExist(opts: IsDirectoryExistOptions): Promise<boolean>
}

export class GitHub implements GitHubAPI {
  octokit: ReturnType<typeof github.getOctokit>
  constructor(token: string) {
    this.octokit = github.getOctokit(token)
  }

  async compareCommits(opts: CompareCommitsOptions) {
    return await this.octokit.repos.compareCommits({
      owner: opts.owner,
      repo: opts.repo,
      base: opts.base,
      head: opts.head,
    })
  }

  async isDirectoryExist(opts: IsDirectoryExistOptions) {
    try {
      await this.octokit.repos.getContent({
        owner: opts.owner,
        repo: opts.repo,
        ref: opts.ref,
        path: opts.path,
      })
      return true
    } catch (err) {
      if (err && err.status === 404) {
        return false
      }

      return Promise.reject(err)
    }
  }
}
