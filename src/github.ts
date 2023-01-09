import * as core from "@actions/core"
import * as github from "@actions/github"

export interface GetChangedFilesOptions {
  owner: string
  repo: string
  eventType: "pull_request" | "push"
  ref: string
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

export interface Commit {
  sha: string
}

export interface GitHubAPI {
  isDirectoryExist(opts: IsDirectoryExistOptions): Promise<boolean>

  getChangedFiles(opts: GetChangedFilesOptions): Promise<Array<File>>
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
    this.isDirectoryExist = createAPIMethod(
      "isDirectoryExist",
      this.isDirectoryExist.bind(this)
    )
    this.getChangedFiles = createAPIMethod(
      "getChangedFiles",
      this.getChangedFiles.bind(this)
    )
  }

  async getChangedFiles(opts: GetChangedFilesOptions) {
    const changedFiles: Array<File> = []

    if (opts.eventType === "pull_request") {
      for await (const response of this.octokit.paginate.iterator(
        this.octokit.rest.pulls.listFiles,
        {
          owner: opts.owner,
          repo: opts.repo,
          pull_number: Number(opts.ref),
        }
      )) {
        changedFiles.push(...response.data)
      }
    }

    if (opts.eventType === "push") {
      for await (const response of this.octokit.paginate.iterator(
        this.octokit.rest.repos.getCommit,
        {
          owner: opts.owner,
          repo: opts.repo,
          ref: opts.ref,
        }
      )) {
        changedFiles.push(...(response.data.files || []))
      }
    }

    return changedFiles
  }

  async isDirectoryExist(opts: IsDirectoryExistOptions) {
    try {
      await this.octokit.rest.repos.getContent({
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
