<a href="https://github.com/Nitive/get-changed-files/actions/workflows/build-test.yaml"><img alt="get-changed-files status" src="https://github.com/Nitive/get-changed-files/workflows/build-test/badge.svg"></a>
<a href="https://github.com/Nitive/get-changed-files/actions/workflows/e2e-test.yaml"><img alt="get-changed-files status" src="https://github.com/Nitive/get-changed-files/workflows/e2e-test/badge.svg"></a>

# get-changed-files action

A GitHub action to get changed in PR or after push actions. It should be used to create build matrix in monorepos to run tests on changed files only.

## Example

```yaml
jobs:
  produce-charts-matrix:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.produce-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v2

      - name: Produce charts matrix from folder structure
        id: produce-matrix
        uses: Nitive/get-changed-files@v1
        with:
          files: |
            charts/*/

  chart-lint:
    needs: produce-charts-matrix
    runs-on: ubuntu-latest
    strategy:
      matrix:
        chart: ${{ fromJson(needs.produce-charts-matrix.outputs.matrix) }}
    env:
      KUBECONFORM_VERSION: v0.4.3
    steps:
      - uses: actions/checkout@v2

      - name: Lint chart
        id: working-directory
        run: make lint
        working-directory: ${{ matrix.chart }}
```
