#!/usr/bin/env bash
# Start backend in foreground — keep this terminal open while developing
exec "$(dirname "$0")/run-backend-jar.sh"
