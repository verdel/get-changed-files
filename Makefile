.PHONY: *

install:
	yarn install --frozen-lockfile

fmt:
	yarn prettier --write .

lint:
	yarn tsc --noEmit --project .
	yarn prettier --check .
	yarn eslint src/**/*.ts

package:
	yarn tsc --project .
	yarn ncc build

test:
	yarn jest
