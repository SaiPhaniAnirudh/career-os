"""
Career OS & NutriTrack — Unified Keep-Alive Bot
================================================
Keeps both deployed Render backends awake (preventing 15-minute free tier spin-down)
and keeps their Supabase databases active (preventing 7-day inactivity pauses).

Services monitored:
1. Career OS:  https://career-os-backend-i375.onrender.com/api/health?ping_db=true
2. NutriTrack: https://nutritrack-k96f.onrender.com/api/health

Usage:
    python scripts/keep_alive_bot.py          # Runs continuous loop every 12 minutes
    python scripts/keep_alive_bot.py --once   # Runs a single check on all services and exits
"""

import sys
import time
import argparse
import urllib.request
import json
from datetime import datetime, timezone

TARGETS = [
    {
        "name": "Career OS",
        "url": "https://career-os-backend-i375.onrender.com/api/health?ping_db=true",
    },
    {
        "name": "NutriTrack",
        "url": "https://nutritrack-k96f.onrender.com/api/health",
    },
]

DEFAULT_INTERVAL_SECONDS = 12 * 60  # 12 minutes


def ping_target(target: dict, timeout: int = 45) -> bool:
    name = target["name"]
    url = target["url"]
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    start_time = time.time()
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Unified-KeepAliveBot/1.0"}
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            latency = round((time.time() - start_time) * 1000, 1)
            status_code = response.getcode()
            body_bytes = response.read()
            try:
                data = json.loads(body_bytes.decode("utf-8"))
            except Exception:
                data = {}

            render_state = data.get("render", data.get("status", "awake"))
            db_state = data.get("supabase", data.get("db", "active"))
            print(f"[{now_str}] [{name:<10}] SUCCESS ({status_code}) — {latency}ms | Server: {render_state} | DB: {db_state}")
            return True
    except Exception as exc:
        latency = round((time.time() - start_time) * 1000, 1)
        print(f"[{now_str}] [{name:<10}] WARNING ({latency}ms) — Waking up or unreachable: {exc}")
        return False


def ping_all() -> None:
    for target in TARGETS:
        ping_target(target)


def main():
    parser = argparse.ArgumentParser(description="Career OS & NutriTrack Keep-Alive Bot")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL_SECONDS, help="Ping interval in seconds (default: 720s / 12min)")
    parser.add_argument("--once", action="store_true", help="Run a single check across all targets and exit")
    args = parser.parse_args()

    print("=" * 68)
    print("  Unified Keep-Alive Bot (Career OS + NutriTrack)")
    for t in TARGETS:
        print(f"  - {t['name']:<12}: {t['url']}")
    print(f"  Interval: {args.interval}s ({args.interval // 60}m)")
    print("=" * 68)

    if args.once:
        ping_all()
        return

    print("Bot is actively running in background. Press Ctrl+C to stop.\n")
    while True:
        try:
            ping_all()
            time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\nKeep-Alive Bot stopped.")
            sys.exit(0)


if __name__ == "__main__":
    main()
