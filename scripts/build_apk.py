"""
Career OS — Android APK & PWA Helper
====================================
Builds the web application and provides automated instructions for generating
and downloading the Android APK package.
"""

import os
import sys
import subprocess
import shutil

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")


def run_command(cmd: str, cwd: str = ROOT_DIR) -> bool:
    print(f"-> Running: {cmd}")
    res = subprocess.run(cmd, shell=True, cwd=cwd)
    return res.returncode == 0


def build_web_assets():
    print("\n[1/3] Building Frontend Web Bundle & PWA Assets...")
    success = run_command("npm run build", cwd=FRONTEND_DIR)
    if not success:
        print("ERROR: Failed to build frontend assets.")
        sys.exit(1)
    print("SUCCESS: Web assets built to frontend/dist.")


def check_local_android_env():
    print("\n[2/3] Checking Android SDK & Gradle environment...")
    has_java = shutil.which("java") is not None
    has_gradle = shutil.which("gradle") is not None
    has_adb = shutil.which("adb") is not None

    print(f"  - Java Runtime: {'Available' if has_java else 'Not Found'}")
    print(f"  - Gradle Build: {'Available' if has_gradle else 'Not Found'}")
    print(f"  - Android Debug Bridge (adb): {'Available' if has_adb else 'Not Found'}")

    return has_java and has_gradle


def print_github_action_instructions():
    print("\n" + "=" * 68)
    print("  🚀 AUTOMATED 1-CLICK CLOUD APK BUILD (RECOMMENDED)")
    print("=" * 68)
    print("A dedicated GitHub Actions workflow is ready in:")
    print("  .github/workflows/build-apk.yml")
    print("\nTo generate and download your Android APK:")
    print("  1. Go to your GitHub repository: https://github.com/SaiPhaniAnirudh/career-os")
    print("  2. Click on the 'Actions' tab at the top.")
    print("  3. Select 'Build Android APK' on the left sidebar.")
    print("  4. Click 'Run workflow' -> 'Run workflow'.")
    print("  5. In ~2 minutes, your 'career-os-debug.apk' will be ready for download")
    print("     under the Artifacts / Releases section!")
    print("=" * 68)


def main():
    print("=" * 68)
    print("  Career OS — APK & PWA Generator")
    print("=" * 68)

    build_web_assets()
    can_build_locally = check_local_android_env()

    if can_build_locally:
        print("\n[3/3] Attempting local Android build...")
        run_command("npm install @capacitor/core @capacitor/cli @capacitor/android", cwd=FRONTEND_DIR)
        run_command("npx cap sync android", cwd=FRONTEND_DIR)
    else:
        print("\n[3/3] Cloud build pipeline configured.")
        print_github_action_instructions()


if __name__ == "__main__":
    main()
