import type {
  GetChangedFilesOptions,
  GitHubAPI,
  IsDirectoryExistOptions,
} from "../github"
import { getChangedFiles, getEventType, getRef } from "../get-changed-files"
import pullRequestEvent from "./events/pull_request_event"
import pushEvent from "./events/push_event"

type GetChangedFilesData = Array<{
  eventType: "pull_request" | "push"
  ref: string
  files: Array<{ filename: string; status: string }>
}>

interface FakeGitHubOptions {
  getChangedFilesData: GetChangedFilesData
  existingDirectories?: string[]
}

class GitHub implements GitHubAPI {
  private opts: FakeGitHubOptions

  constructor(opts: FakeGitHubOptions) {
    this.opts = opts
  }

  async getChangedFiles(opts: GetChangedFilesOptions) {
    const data = this.opts.getChangedFilesData.find(
      (d) => d.eventType === opts.eventType && d.ref === opts.ref
    )

    if (!data) {
      return Promise.reject(
        new Error(`Not found. opts: ${JSON.stringify(opts)}`)
      )
    }

    return Promise.resolve(data.files)
  }

  async isDirectoryExist(opts: IsDirectoryExistOptions) {
    return !!this.opts.existingDirectories?.includes(opts.path)
  }
}

function info(data: any) {}
function debug(data: any) {}
const log = { info, debug }

const events = [
  {
    name: "pull_request",
    event: pullRequestEvent,
  },
  {
    name: "push",
    event: pushEvent,
  },
]

for (const event of events) {
  describe(`${event.name} event`, () => {
    test("should return list of added and modified files", async () => {
      const gh = new GitHub({
        getChangedFilesData: [
          {
            eventType: getEventType(event.event),
            ref: getRef(event.event),
            files: [
              {
                filename: "packages/package-1/package.json",
                status: "modified",
              },
              { filename: "packages/package-2/package.json", status: "added" },
            ],
          },
        ],
      })

      const result = await getChangedFiles({
        gh,
        inputs: { files: "**/*" },
        event: event.event,
        log,
      })

      expect(result).toEqual({
        files: [
          "packages/package-1/package.json",
          "packages/package-2/package.json",
        ],
        empty: false,
      })
    })
    test("should not return removed files", async () => {
      const gh = new GitHub({
        getChangedFilesData: [
          {
            eventType: getEventType(event.event),
            ref: getRef(event.event),
            files: [
              {
                filename: "packages/package-1/package.json",
                status: "modified",
              },
              { filename: "packages/package-2/package.json", status: "added" },
              {
                filename: "packages/package-3/package.json",
                status: "removed",
              },
            ],
          },
        ],
      })

      const result = await getChangedFiles({
        gh,
        inputs: { files: "**/*" },
        event: event.event,
        log,
      })

      expect(result).toEqual({
        files: [
          "packages/package-1/package.json",
          "packages/package-2/package.json",
        ],
        empty: false,
      })
    })

    test("should return directories if glob ends with slash", async () => {
      const gh = new GitHub({
        getChangedFilesData: [
          {
            eventType: getEventType(event.event),
            ref: getRef(event.event),
            files: [
              {
                filename: "packages/package-1/package.json",
                status: "modified",
              },
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
        event: event.event,
        log,
      })

      expect(result).toEqual({
        files: [
          "packages/package-1/",
          "packages/package-2/",
          "packages/package-3/",
        ],
        empty: false,
      })
    })

    test("should return directories with only removed files if they exist on remote", async () => {
      const gh = new GitHub({
        getChangedFilesData: [
          {
            eventType: getEventType(event.event),
            ref: getRef(event.event),
            files: [
              {
                filename: "packages/package-1/package.json",
                status: "modified",
              },
              { filename: "packages/package-2/package.json", status: "added" },
              {
                filename: "packages/package-3/package.json",
                status: "removed",
              },
            ],
          },
        ],
        existingDirectories: ["packages/package-3/"],
      })

      const result = await getChangedFiles({
        gh,
        inputs: { files: "packages/*/" },
        event: event.event,
        log,
      })

      expect(result).toEqual({
        files: [
          "packages/package-1/",
          "packages/package-2/",
          "packages/package-3/",
        ],
        empty: false,
      })
    })

    test("should not return directories with only removed files if they do not exist on remote", async () => {
      const gh = new GitHub({
        getChangedFilesData: [
          {
            eventType: getEventType(event.event),
            ref: getRef(event.event),
            files: [
              {
                filename: "packages/package-1/package.json",
                status: "modified",
              },
              { filename: "packages/package-2/package.json", status: "added" },
              {
                filename: "packages/package-3/package.json",
                status: "removed",
              },
            ],
          },
        ],
      })

      const result = await getChangedFiles({
        gh,
        inputs: { files: "packages/*/" },
        event: event.event,
        log,
      })

      expect(result).toEqual({
        files: ["packages/package-1/", "packages/package-2/"],
        empty: false,
      })
    })

    test("should return empty files list", async () => {
      const gh = new GitHub({
        getChangedFilesData: [
          {
            eventType: getEventType(event.event),
            ref: getRef(event.event),
            files: [
              {
                filename: "packages/package-1/package.json",
                status: "modified",
              },
              { filename: "packages/package-2/package.json", status: "added" },
              {
                filename: "packages/package-3/package.json",
                status: "removed",
              },
            ],
          },
        ],
      })

      const result = await getChangedFiles({
        gh,
        inputs: { files: "src/*" },
        event: event.event,
        log,
      })

      expect(result).toEqual({
        files: [],
        empty: true,
      })
    })
  })
}
