#!/bin/bash
# Render toan bo file PlantUML (.puml) trong thu muc diagram
# Dung: bash diagram/render.sh

DIR="$(dirname "$0")"
echo "=== Render PlantUML ==="
for f in "$DIR"/*.puml; do
    [ -f "$f" ] || continue
    name=$(basename "$f" .puml)
    echo "  $name.puml ..."
    plantuml "$f" 2>&1 && echo "  -> $name.png OK" || echo "  -> $name.png FAIL"
done
echo "=== Hoan tat ==="
