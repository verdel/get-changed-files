import minimatch from "minimatch"
import { GitHubAPI } from "./github"
import { getChangedDirectories } from "./get-changed-directories"

interface Inputs {
  files: string
}

interface GitHubEvent {
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

export async function getChangedFiles({
  gh,
  inputs,
  event,
}: {
  gh: GitHubAPI
  inputs: Inputs
  event: GitHubEvent
}) {
  const filesGlobs = inputs.files
    .trim()
    .split("\n")
    .map((s) => s.trim())

  const result = await gh.compareCommits({
    owner: event.repository.owner.login,
    repo: event.repository.name,
    base: event.pull_request.base.sha,
    head: event.pull_request.merge_commit_sha,
  })

  const existingFiles = result.data.files
    // This action is suppose to find existing files and run tests on them
    // so we can filter out removed ones
    .filter((file) => file.status !== "removed")
    .map((file) => file.filename)

  const matchingFiles = existingFiles.filter((fileName) =>
    filesGlobs
      .filter((glob) => !glob.endsWith("/"))
      .some((glob) => minimatch(fileName, glob))
  )

  const changedDirectories = getChangedDirectories(result.data.files)
  const matchedChangedDirectories = changedDirectories.filter((fileName) =>
    filesGlobs
      .filter((glob) => glob.endsWith("/"))
      .some((glob) => minimatch(fileName.dirname, glob))
  )

  const matchedChangedExistingDirectories = (
    await Promise.all(
      matchedChangedDirectories.map(async (dir) => {
        const exists =
          !dir.mayBeRemoved ||
          (await gh.isDirectoryExist({
            owner: event.repository.owner.login,
            repo: event.repository.name,
            ref: event.pull_request.merge_commit_sha,
            path: dir.dirname,
          }))

        return exists ? dir.dirname : undefined
      })
    )
  ).filter(Boolean)

  return {
    files: [...matchingFiles, ...matchedChangedExistingDirectories],
  }
}
