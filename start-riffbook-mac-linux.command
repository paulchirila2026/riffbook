#!/bin/bash
# Riffbook local server for macOS / Linux.
# Uses the built-in Ruby on macOS (no install, no licence prompts); falls back to Python 3.
cd "$(dirname "$0")" || exit 1
PORT=8780
URL="http://localhost:$PORT"
echo ""
echo "  Starting Riffbook at $URL"
echo "  Keep this window open while using the app. Close it (or press Ctrl+C) to stop."
echo ""
( sleep 2; (open "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null) ) &

if [ -x /usr/bin/ruby ] && /usr/bin/ruby -e 'require "webrick"' 2>/dev/null; then
  exec /usr/bin/ruby -run -e httpd . -p $PORT -b 127.0.0.1
elif command -v python3 >/dev/null 2>&1 && python3 -c "pass" >/dev/null 2>&1; then
  exec python3 -m http.server $PORT --bind 127.0.0.1
else
  echo "  Could not find Ruby or Python 3 on this computer."
  echo "  On macOS: run  xcode-select --install  once, then open this file again."
  read -r -p "  Press Enter to close…" _
fi
