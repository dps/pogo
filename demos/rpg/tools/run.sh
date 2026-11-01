#!/bin/zsh
# Runs a tool from the game folder. Needs node on PATH.
cd "${0:A:h}/.."
exec node "$@"
