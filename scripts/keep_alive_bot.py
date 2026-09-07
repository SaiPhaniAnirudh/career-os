"""
Career OS — Keep-Alive Bot
===========================
Keeps the deployed Render backend awake (preventing the 15-minute free tier idle sleep)
and keeps Supabase active (preventing the 7-day auto-pause for inactive databases).

Usage:
    python scripts/keep_alive_bot.py          # Runs continuous loop every 12 minutes
    python scripts/keep_alive_bot.py --once   # Runs a single ping and exits
"""

import sys
import time
import argparse
import urllib.request
import json
from datetime import datetime, timezone

DEFAULT_URL = "https://career-os-backend-i375.onrender.com/api/health?ping_db=true"
DEFAULT_INTERVAL_SECONDS = 12 * 60  # 12 minutes (Render spins down at 15 minutes)


def ping(url: str, timeout: int = 45):
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    start_time = time.time()
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "CareerOS-KeepAliveBot/1.0"}
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            latency = round((time.time() - start_time) * 1000, 1)
            status_code = response.getcode()
            body_bytes = response.read()
            try:
                data = json.loads(body_bytes.decode("utf-8"))
            except Exception:
                data = {}

            render_state = data.get("render", "awake")
            db_state = data.get("supabase", "active")
            print(f"[{now_str}] SUCCESS (HTTP {status_code}) — {latency}ms | Render: {render_state} | Supabase: {db_state}")
            return True
    except Exception as exc:
        latency = round((time.time() - start_time) * 1000, 1)
        print(f"[{now_str}] WARNING ({latency}ms) — Backend is waking up or unreachable: {exc}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Career OS Keep-Alive Bot")
    parser.add_argument("--url", default=DEFAULT_URL, help="Target keep-alive healthcheck URL")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL_SECONDS, help="Ping interval in seconds (default: 720s / 12min)")
    parser.add_argument("--once", action="store_true", help="Run a single ping and exit")
    args = parser.parse_args()

    print("=" * 60)
    print("  Career OS Keep-Alive Bot")
    print(f"  Target: {args.url}")
    print(f"  Interval: {args.interval} seconds ({args.interval // 60} minutes)")
    print("=" * 60)

    if args.once:
        ping(args.url)
        return

    print("Bot is running. Press Ctrl+C to stop.\n")
    while True:
        try:
            ping(args.url)
            time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\nKeep-Alive Bot stopped by user.")
            sys.exit(0)


if __name__ == "__main__":
    main()
