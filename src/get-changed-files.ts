import minimatch from "minimatch"
import { GitHubAPI } from "./github"
import { getChangedDirectories } from "./get-changed-directories"

interface Inputs {
  files: string
}

interface GitHubPullRequestEvent {
  repository: {
    owner: {
      login: string
    }
    name: string
  }
  pull_request: {
    merge_commit_sha: string
    base: { sha: string }
    head: { sha: string }
  }
}

function isGitHubPullRequestEvent(
  event: GitHubEvent
): event is GitHubPullRequestEvent {
  return !!(event as any).pull_request
}

interface GitHubPushEvent {
  repository: {
    owner: {
      login: string
    }
    name: string
  }
  before: string
  after: string
}

function isGitHubPushEvent(event: GitHubEvent): event is GitHubPushEvent {
  return !!(event as any).after
}

type GitHubEvent = GitHubPullRequestEvent | GitHubPushEvent

function getBeforeAfterShas(event: GitHubEvent) {
  if (isGitHubPullRequestEvent(event)) {
    return {
      before: event.pull_request.base.sha,
      after: event.pull_request.merge_commit_sha || event.pull_request.head.sha,
    }
  } else if (isGitHubPushEvent(event)) {
    return {
      before: event.before,
      after: event.after,
    }
  }

  throw new Error("Unexpected event")
}

interface Log {
  info: (data: any) => void
  debug: (data: any) => void
}

export async function getChangedFiles({
  gh,
  inputs,
  event,
  log,
}: {
  gh: GitHubAPI
  inputs: Inputs
  event: GitHubEvent
  log: Log
}) {
  log.debug({ inputs, event })

  const filesGlobs = inputs.files
    .trim()
    .split("\n")
    .map((s) => s.trim())

  const sha = getBeforeAfterShas(event)

  const isFirstPushOfBranch =
    sha.before === "0000000000000000000000000000000000000000"
  if (isFirstPushOfBranch) {
    return {
      files: [],
      empty: true,
    }
  }

  const result = await gh.compareCommits({
    owner: event.repository.owner.login,
    repo: event.repository.name,
    base: sha.before,
    head: sha.after,
  })

  log.info({
    allChangedFiles: result.data.files.map((f) => ({
      filename: f.filename,
      status: f.status,
    })),
  })

  const existingFiles = result.data.files
    // This action is suppose to find existing files and run tests on them
    // so we can filter out removed ones
    .filter((file) => file.status !== "removed")
    .map((file) => file.filename)

  log.info({ existingFiles })

  const matchingFiles = existingFiles.filter((fileName) =>
    filesGlobs
      .filter((glob) => !glob.endsWith("/"))
      .some((glob) => minimatch(fileName, glob))
  )
  log.info({ matchingFiles })

  const changedDirectories = getChangedDirectories(result.data.files)

  log.info({ changedDirectories })

  const matchedChangedDirectories = changedDirectories.filter((fileName) =>
    filesGlobs
      .filter((glob) => glob.endsWith("/"))
      .some((glob) => minimatch(fileName.dirname, glob))
  )

  log.info({ matchedChangedDirectories })

  const matchedChangedExistingDirectories = (
    await Promise.all(
      matchedChangedDirectories.map(async (dir) => {
        const exists =
          !dir.mayBeRemoved ||
          (await gh.isDirectoryExist({
            owner: event.repository.owner.login,
            repo: event.repository.name,
            ref: sha.after,
            path: dir.dirname,
          }))

        return exists ? dir.dirname : undefined
      })
    )
  ).filter(Boolean)

  log.info({ matchedChangedExistingDirectories })
  const files = [...matchingFiles, ...matchedChangedExistingDirectories]

  return {
    files,
    empty: files.length === 0,
  }
}
