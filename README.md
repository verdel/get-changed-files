<a href="https://github.com/Nitive/get-changed-files/actions/workflows/build-test.yaml"><img alt="get-changed-files status" src="https://github.com/Nitive/get-changed-files/workflows/build-test/badge.svg"></a>
<a href="https://github.com/Nitive/get-changed-files/actions/workflows/e2e-test.yaml"><img alt="get-changed-files status" src="https://github.com/Nitive/get-changed-files/workflows/e2e-test/badge.svg"></a>

# get-changed-files action

A GitHub action to get changed in PR or after push actions. It should be used to create build matrix in monorepos to run tests on changed files only.

## Example

```yaml
jobs:
  produce-packages-matrix:
    runs-on: ubuntu-latest
    outputs:
      files: ${{ steps.produce-matrix.outputs.files }}
      empty: ${{ steps.produce-matrix.outputs.empty }}
    steps:
      - uses: actions/checkout@v2

      - name: Produce packages matrix from folder structure
        id: produce-matrix
        uses: Nitive/get-changed-files@v1
        with:
          files: |
            packages/*/

  package-lint:
    needs: produce-packages-matrix
    if: ${{ needs.produce-packages-matrix.outputs.empty == 'false' }}
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: ${{ fromJson(needs.produce-packages-matrix.outputs.files) }}
    steps:
      - uses: actions/checkout@v2

      - name: Lint package
        id: working-directory
        run: make lint
        working-directory: ${{ matrix.package }}
```
