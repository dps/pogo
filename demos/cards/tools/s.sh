#!/bin/bash
# tools/s.sh <device> <out> <steps> "<eval>"
exec node ../../bin/pogo.js shot . --device "$1" --out "$2" --steps "${3:-60}" --eval "$4"
