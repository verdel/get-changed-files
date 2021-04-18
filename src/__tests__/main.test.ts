import type {
  CompareCommitsOptions,
  GitHubAPI,
  IsDirectoryExistOptions,
} from "../github"
import { getChangedFiles } from "../get-changed-files"

// TODO: use real event
import pullRequestEvent from "./events/pull_request_event"

type CompareFilesData = Array<{
  base: string
  head: string
  files: Array<{ filename: string; status: string }>
}>

interface FakeGitHubOptions {
  compareFilesData: CompareFilesData
  existingDirectories?: string[]
}

class GitHub implements GitHubAPI {
  private opts: FakeGitHubOptions

  constructor(opts: FakeGitHubOptions) {
    this.opts = opts
  }

  async compareCommits(opts: CompareCommitsOptions) {
    const data = this.opts.compareFilesData.find(
      (d) => d.base === opts.base && d.head === opts.head
    )

    if (!data) {
      return Promise.reject(new Error("Not found"))
    }

    return Promise.resolve({
      data: {
        files: data.files,
      },
    })
  }

  async isDirectoryExist(opts: IsDirectoryExistOptions) {
    return !!this.opts.existingDirectories?.includes(opts.path)
  }
}

test("should return list of added and modified files", async () => {
  const gh = new GitHub({
    compareFilesData: [
      {
        base: pullRequestEvent.pull_request.base.sha,
        head: pullRequestEvent.pull_request.merge_commit_sha,
        files: [
          { filename: "packages/package-1/package.json", status: "modified" },
          { filename: "packages/package-2/package.json", status: "added" },
        ],
      },
    ],
  })

  const result = await getChangedFiles({
    gh,
    inputs: { files: "**/*" },
    event: pullRequestEvent,
  })

  expect(result).toEqual({
    files: [
      "packages/package-1/package.json",
      "packages/package-2/package.json",
    ],
  })
})

test("should not return removed files", async () => {
  const gh = new GitHub({
    compareFilesData: [
      {
        base: pullRequestEvent.pull_request.base.sha,
        head: pullRequestEvent.pull_request.merge_commit_sha,
        files: [
          { filename: "packages/package-1/package.json", status: "modified" },
          { filename: "packages/package-2/package.json", status: "added" },
          { filename: "packages/package-3/package.json", status: "removed" },
        ],
      },
    ],
  })

  const result = await getChangedFiles({
    gh,
    inputs: { files: "**/*" },
    event: pullRequestEvent,
  })

  expect(result).toEqual({
    files: [
      "packages/package-1/package.json",
      "packages/package-2/package.json",
    ],
  })
})

test("should return directories if glob ends with slash", async () => {
  const gh = new GitHub({
    compareFilesData: [
      {
        base: pullRequestEvent.pull_request.base.sha,
        head: pullRequestEvent.pull_request.merge_commit_sha,
        files: [
          { filename: "packages/package-1/package.json", status: "modified" },
          { filename: "packages/package-2/package.json", status: "added" },
          { filename: "packages/package-3/test.js", status: "removed" },
          { filename: "packages/package-3/index.js", status: "modified" },
        ],
      },
    ],
  })

  const result = await getChangedFiles({
    gh,
    inputs: { files: "packages/*/" },
    event: pullRequestEvent,
  })

  expect(result).toEqual({
    files: [
      "packages/package-1/",
      "packages/package-2/",
      "packages/package-3/",
    ],
  })
})

test("should return directories with only removed files if they exist on remote", async () => {
  const gh = new GitHub({
    compareFilesData: [
      {
        base: pullRequestEvent.pull_request.base.sha,
        head: pullRequestEvent.pull_request.merge_commit_sha,
        files: [
          { filename: "packages/package-1/package.json", status: "modified" },
          { filename: "packages/package-2/package.json", status: "added" },
          { filename: "packages/package-3/package.json", status: "removed" },
        ],
      },
    ],
    existingDirectories: ["packages/package-3/"],
  })

  const result = await getChangedFiles({
    gh,
    inputs: { files: "packages/*/" },
    event: pullRequestEvent,
  })

  expect(result).toEqual({
    files: [
      "packages/package-1/",
      "packages/package-2/",
      "packages/package-3/",
    ],
  })
})

test("should not return directories with only removed files if they do not exist on remote", async () => {
  const gh = new GitHub({
    compareFilesData: [
      {
        base: pullRequestEvent.pull_request.base.sha,
        head: pullRequestEvent.pull_request.merge_commit_sha,
        files: [
          { filename: "packages/package-1/package.json", status: "modified" },
          { filename: "packages/package-2/package.json", status: "added" },
          { filename: "packages/package-3/package.json", status: "removed" },
        ],
      },
    ],
  })

  const result = await getChangedFiles({
    gh,
    inputs: { files: "packages/*/" },
    event: pullRequestEvent,
  })

  expect(result).toEqual({
    files: ["packages/package-1/", "packages/package-2/"],
  })
})
