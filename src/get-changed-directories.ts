import * as path from "path"
import { File } from "./github"

interface Directory {
  dirname: string
  mayBeRemoved?: boolean
}

function spritRenamedFiles(files: File[]): File[] {
  return files.flatMap((file) => {
    if (file.status === "renamed" && file.previous_filename) {
      return [
        { filename: file.filename, status: "added" },
        { filename: file.previous_filename, status: "removed" },
      ]
    }
    return [file]
  })
}

// Get changed directories based on list of changed files
//
// There are tricky moments:
// 1. we can't know if directory still exist if files were deleted from it
// 2. renamed files also can lead to directory removal
//
// In this function we try to get the best info we can about what directories
// still exist so we don't have to make calls to GitHub API. For example, if
// file was removed from directory but another file was added, the directory
// exists.
export function getChangedDirectories(files: Array<File>): Array<Directory> {
  const directories: Directory[] = [{ dirname: "." }]

  for (let file of spritRenamedFiles(files)) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      file = {
        ...file,
        filename: path.dirname(file.filename),
      }

      if (file.filename === "." || file.filename === "/") {
        break
      }

      const dirname = `${file.filename}/`
      const dir = directories.find((d) => d.dirname === dirname)
      if (!dir) {
        const newDir: Directory = { dirname }
        if (file.status === "removed") {
          newDir.mayBeRemoved = true
        }
        directories.push(newDir)
      } else if (dir.mayBeRemoved && file.status !== "removed") {
        delete dir.mayBeRemoved
      }
    }
  }

  return directories.sort((a, b) => (a.dirname > b.dirname ? 1 : -1))
}
