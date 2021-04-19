import * as core from "@actions/core"
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
    opts: CompareCommitsOptions
  ): Promise<{
    data: {
      files: Array<File>
    }
  }>

  isDirectoryExist(opts: IsDirectoryExistOptions): Promise<boolean>
}

function createAPIMethod<Opts, Response>(
  name: string,
  fn: (opts: Opts) => Promise<Response>
): (opts: Opts) => Promise<Response> {
  return async (opts: Opts) => {
    try {
      return await fn(opts)
    } catch (err) {
      core.debug(JSON.stringify({ name, opts, err: err.toString() }))
      return Promise.reject(err)
    }
  }
}

export class GitHub implements GitHubAPI {
  octokit: ReturnType<typeof github.getOctokit>
  constructor(token: string) {
    this.octokit = github.getOctokit(token)
    this.compareCommits = createAPIMethod(
      "compareCommits",
      this.compareCommits.bind(this)
    )
    this.isDirectoryExist = createAPIMethod(
      "isDirectoryExist",
      this.isDirectoryExist.bind(this)
    )
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
        path: opts.path.replace(/\/$/, ""),
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
