# Packaging & Installer (Windows 10)

This project already includes Electron + Next.js and `electron-builder` configuration. Below are the recommended steps and a CI workflow you can use to build a Windows installer (.exe) that works on Windows 10.

---

## Prerequisites (on Windows build machine)

- Node.js (LTS, e.g. 18+ or 20+) installed and on PATH
- npm (comes with Node) or yarn
- Git (optional)
- (Recommended) NSIS installed for `electron-builder` NSIS target. On Windows you can install NSIS from https://nsis.sourceforge.io/Download or via Chocolatey: `choco install nsis`.
  - `electron-builder` will often download a portable NSIS when needed, but having the system `makensis` avoids failures.
- Optional: Code signing credentials if you want signed installers (not covered here).

---

## Quick local build (PowerShell)

1. From the repo root open PowerShell (Run as Administrator if you want installer to write to Program Files during testing).
2. Install deps and build (one-off):

```powershell
# Install dependencies (root)
npm ci

# Build the Next.js app
cd .\beyon79
npm ci
npm run build
cd ..

# Build the Electron installer (windows x64)
# You can use the provided script build-installer.ps1 or run electron-builder directly
.\build-installer.ps1
# or
# $env:NODE_ENV = "production"; npx electron-builder --win --x64 --publish=never
```

3. Output location:
- electron-builder by default writes outputs into `dist/` (see `package.json` "build.directories.output"). Look for `dist/*.exe` and a `dist/win-unpacked` directory.

4. Test installation: run the generated `Beyon Admin Setup <version>.exe` on a Windows 10 VM or machine. Follow install flow and confirm app launches.

---

## Notes about the repo scripts

- Root `package.json` has these useful scripts:
  - `npm run web:build` → runs `cd beyon79 && npm run build` (produces `.next/standalone`)
  - `npm run dist` → builds the web app then runs `electron-builder --publish=never`
- There is also a `build-installer.ps1` in repo root that automates the steps above (it installs electron-builder globally if not found).
- The `build` config in `package.json` is already configured for `nsis` with installer options.

---

## Troubleshooting

- If `electron-builder` fails with `makensis not found` or NSIS errors, install NSIS or ensure `makensis` is available in PATH.
- If building from Linux/macOS to Windows, you need Wine + nsis or cross-build support — building on Windows is the simplest approach.
- If `next build` reports `output: 'standalone'` issues, ensure `beyon79/.next/standalone` exists after build and that `package.json` `files` in root `build` config matches it. The repo is already configured to include `.next/standalone` and `.next/static`.
- If the installer contains large node_modules, check the `files` list in `package.json` `build` section and the `asar` settings.

---

## Optional: GitHub Actions workflow (builds Windows installer and uploads artifact)

Create a Workflow file `.github/workflows/windows-build.yml` with the following steps to produce artifacts on `windows-latest`:

```yaml
name: build-windows-installer

on:
  push:
    branches: [ main ]
  workflow_dispatch: {}

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install root dependencies
        run: npm ci

      - name: Build web (Next.js)
        run: |
          cd beyon79
          npm ci
          npm run build

      - name: Build Electron installer
        env:
          NODE_ENV: production
        run: |
          npx electron-builder --win --x64 --publish=never

      - name: Upload installer artifact
        uses: actions/upload-artifact@v4
        with:
          name: beyon-windows-installer
          path: dist/*.exe
```

Notes: building on GitHub Actions Windows runners avoids needing to provision your own Windows VM.

---

## Next steps I can take for you

- Run an automated check of the `electron-builder` configuration and confirm file globs point to existing build output paths.
- Add the GitHub Actions workflow file to the repository for you (I can create `.github/workflows/windows-build.yml`).
- Run the packaging locally here (not usually recommended because it requires a Windows build environment). I can instead prepare the CI workflow and/or run a dry-check.

Tell me which of the next steps you'd like me to do and I'll proceed.
