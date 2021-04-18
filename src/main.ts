import * as core from "@actions/core"
import * as fs from "fs"
import { getChangedFiles } from "./get-changed-files"
import { GitHub } from "./github"

async function run(): Promise<void> {
  try {
    const filesInput = core.getInput("files")

    const gh = new GitHub(core.getInput("token", { required: true }))
    const inputs = {
      files: filesInput,
    }

    const eventPath = process.env.GITHUB_EVENT_PATH
    if (!eventPath) {
      throw new Error("GitHub event not found")
    }
    const event = JSON.parse(await fs.promises.readFile(eventPath, "utf8"))

    const result = await getChangedFiles({ gh, inputs, event })

    core.setOutput("files", result.files)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
