import { getChangedDirectories } from "../get-changed-directories"

test("should return list of added files", async () => {
  const actual = getChangedDirectories([
    { filename: "dir/added-file.yaml", status: "added" },
  ])

  const expected = [{ dirname: "." }, { dirname: "dir/" }]

  expect(actual).toEqual(expected)
})

test("should return list of modified files", async () => {
  const actual = getChangedDirectories([
    { filename: "dir/modified-file.yaml", status: "modified" },
  ])

  const expected = [{ dirname: "." }, { dirname: "dir/" }]

  expect(actual).toEqual(expected)
})

test("should not duplicate directories", async () => {
  const actual = getChangedDirectories([
    { filename: "dir/added-file.yaml", status: "added" },
    { filename: "dir/modified-file.yaml", status: "modified" },
  ])

  const expected = [{ dirname: "." }, { dirname: "dir/" }]

  expect(actual).toEqual(expected)
})

test("should add mayBeRemoved: true to directories with only removed files", async () => {
  const actual = getChangedDirectories([
    { filename: "dir/removed-file.yaml", status: "removed" },
  ])

  const expected = [{ dirname: "." }, { dirname: "dir/", mayBeRemoved: true }]

  expect(actual).toEqual(expected)
})

test("should not add mayBeRemoved: true to directories with not only removed files", async () => {
  const actual = getChangedDirectories([
    { filename: "dir/removed-file.yaml", status: "removed" },
    { filename: "dir/added-file.yaml", status: "added" },
  ])

  const expected = [{ dirname: "." }, { dirname: "dir/" }]

  expect(actual).toEqual(expected)
})

test("should add mayBeRemoved: true to directories with renamed files", async () => {
  const actual = getChangedDirectories([
    {
      filename: "dir-2/renamed-file.yaml",
      previous_filename: "dir/renamed-file.yaml",
      status: "renamed",
    },
  ])

  const expected = [
    { dirname: "." },
    { dirname: "dir-2/" },
    { dirname: "dir/", mayBeRemoved: true },
  ]

  expect(actual).toEqual(expected)
})

test("should not add mayBeRemoved: true to directories with renamed files if other files were added to the same folder", async () => {
  const actual = getChangedDirectories([
    {
      filename: "dir-2/renamed-file.yaml",
      previous_filename: "dir/renamed-file.yaml",
      status: "renamed",
    },
    { filename: "dir/added-file.yaml", status: "added" },
  ])

  const expected = [
    { dirname: "." },
    { dirname: "dir-2/" },
    { dirname: "dir/" },
  ]

  expect(actual).toEqual(expected)
})
