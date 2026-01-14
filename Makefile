.PHONY: build-firefox build-chrome


build-firefox:
	@echo "Building for Firefox..."
	@rm -rf dist
	@mkdir -p build
	@mkdir -p dist
	@echo "Copying files..."
	@echo "Merging manifest.json..."
	@python3 scripts/build-manifest.py firefox src
	@cp -r src/* dist/
	@echo "Removing manifest directory..."
	@rm -rf dist/manifest
	@echo "Zipping extension..."
	@echo "Zipping extension..."
	@cd dist && zip -r -0 ../build/animestars_extension-firefox.xpi *
	@echo "Removing dist directory..."
	@rm -rf dist
	@echo "Build complete"

build-chrome:
	@echo "Building for Chrome..."
	@rm -rf dist
	@mkdir -p build
	@mkdir -p dist
	@echo "Merging manifest.json..."
	@python3 scripts/build-manifest.py chrome src
	@echo "Copying files..."
	@cp -r src/* dist/
	@echo "Removing manifest directory..."
	@rm -rf dist/manifest
	@echo "Zipping extension..."
	@cd dist && zip -r -0 ../build/animestars_extension-chrome.zip *
	@echo "Packing extension (optional)..."
	@if [ -f mykey.pem ] && command -v google-chrome >/dev/null 2>&1; then \
		google-chrome --pack-extension=./dist --pack-extension-key=mykey.pem; \
		mv dist.crx build/animestars_extension-chrome.crx; \
	else \
		echo "Skip CRX packing (missing mykey.pem or google-chrome). ZIP is ready in build/."; \
	fi
	@echo "Removing dist directory..."
	@rm -rf dist
	@echo "Build complete"
