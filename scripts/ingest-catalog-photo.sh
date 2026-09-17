#!/usr/bin/env bash
#
# Ingests one catalog photo end to end: resize + compress, upload to the public
# catalog-media bucket, and record license/author/attribution on the matching
# property_images or unit_images row (plus optional alt_text translations).
#
# Requires macOS `sips` (resize/compress) and a Supabase service-role key — never commit
# that key. Export it for one shell session only:
#   export SUPABASE_SERVICE_ROLE_KEY=...        (Project Settings > API, "service_role")
#
# Usage:
#   scripts/ingest-catalog-photo.sh \
#     --input ./photo.jpg \
#     --table unit_images \
#     --id bbbbbbbb-0000-0000-0000-000000000001 \
#     --storage-path ayni-mountain-cabins/killa-1.jpg \
#     --license CC_BY \
#     --author "Jane Doe" \
#     --source-url "https://commons.wikimedia.org/wiki/File:Example.jpg" \
#     --attribution "Photo by Jane Doe, CC BY 4.0, via Wikimedia Commons" \
#     --alt-es "Interior de la cabaña con chimenea." \
#     --alt-en "Cabin interior with a fireplace."
#
# --table must be "unit_images" or "property_images". --id is the existing row's id
# (create the row first via the seed or Studio; this script only updates media/license
# fields on an existing row, it never creates properties/units).
# --max-size (default 1600) and --quality (default 72, 0-100) control the sips resize.

set -euo pipefail

MAX_SIZE=1600
QUALITY=72
ALT_ES=""
ALT_EN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --input) INPUT="$2"; shift 2 ;;
    --table) TABLE="$2"; shift 2 ;;
    --id) ROW_ID="$2"; shift 2 ;;
    --storage-path) STORAGE_PATH="$2"; shift 2 ;;
    --license) LICENSE="$2"; shift 2 ;;
    --author) AUTHOR="$2"; shift 2 ;;
    --source-url) SOURCE_URL="$2"; shift 2 ;;
    --attribution) ATTRIBUTION="$2"; shift 2 ;;
    --alt-es) ALT_ES="$2"; shift 2 ;;
    --alt-en) ALT_EN="$2"; shift 2 ;;
    --max-size) MAX_SIZE="$2"; shift 2 ;;
    --quality) QUALITY="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

for var in INPUT TABLE ROW_ID STORAGE_PATH LICENSE AUTHOR SOURCE_URL ATTRIBUTION; do
  if [[ -z "${!var:-}" ]]; then
    echo "Missing required --${var,,} (see script header for usage)." >&2
    exit 1
  fi
done

if [[ "$TABLE" != "unit_images" && "$TABLE" != "property_images" ]]; then
  echo "--table must be unit_images or property_images, got: $TABLE" >&2
  exit 1
fi

case "$LICENSE" in
  CC0|PUBLIC_DOMAIN|CC_BY|CC_BY_SA|COMMERCIAL) ;;
  *) echo "--license must be one of CC0, PUBLIC_DOMAIN, CC_BY, CC_BY_SA, COMMERCIAL, got: $LICENSE" >&2; exit 1 ;;
esac

if [[ ! -f "$INPUT" ]]; then
  echo "Input file not found: $INPUT" >&2
  exit 1
fi

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "Export SUPABASE_SERVICE_ROLE_KEY first (Project Settings > API > service_role)." >&2
  exit 1
fi

if ! command -v sips >/dev/null 2>&1; then
  echo "This script uses macOS 'sips' for resize/compress; run it on a Mac." >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$REPO_ROOT/.env" ]]; then
  SUPABASE_URL="$(grep -E '^EXPO_PUBLIC_SUPABASE_URL=' "$REPO_ROOT/.env" | cut -d= -f2-)"
fi
if [[ -z "${SUPABASE_URL:-}" ]]; then
  echo "Set EXPO_PUBLIC_SUPABASE_URL in .env, or export SUPABASE_URL, before running this." >&2
  exit 1
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
OPTIMIZED="$WORKDIR/$(basename "$STORAGE_PATH")"

ORIGINAL_SIZE=$(stat -f%z "$INPUT")
sips -Z "$MAX_SIZE" -s formatOptions "$QUALITY" "$INPUT" --out "$OPTIMIZED" >/dev/null
OPTIMIZED_SIZE=$(stat -f%z "$OPTIMIZED")
echo "Resized $(basename "$INPUT"): $((ORIGINAL_SIZE / 1024)) KB -> $((OPTIMIZED_SIZE / 1024)) KB"

echo "Uploading to catalog-media/$STORAGE_PATH..."
UPLOAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "$SUPABASE_URL/storage/v1/object/catalog-media/$STORAGE_PATH" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: image/jpeg" \
  -H "x-upsert: true" \
  --data-binary "@$OPTIMIZED")
if [[ "$UPLOAD_STATUS" != "200" ]]; then
  echo "Upload failed (HTTP $UPLOAD_STATUS)." >&2
  exit 1
fi

VERIFIED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
PATCH_PAYLOAD=$(python3 -c "
import json
print(json.dumps({
  'storage_path': '$STORAGE_PATH',
  'source_url': '''$SOURCE_URL''',
  'author': '''$AUTHOR''',
  'license': '$LICENSE',
  'attribution_text': '''$ATTRIBUTION''',
  'license_verified_at': '$VERIFIED_AT',
  'verification_note': None,
}))
")

echo "Updating $TABLE row $ROW_ID..."
PATCH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
  "$SUPABASE_URL/rest/v1/$TABLE?id=eq.$ROW_ID" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "$PATCH_PAYLOAD")
if [[ "$PATCH_STATUS" != "204" ]]; then
  echo "DB update failed (HTTP $PATCH_STATUS)." >&2
  exit 1
fi

TRANSLATIONS_TABLE="unit_image_translations"
if [[ "$TABLE" == "property_images" ]]; then
  TRANSLATIONS_TABLE="property_image_translations"
fi

if [[ -n "$ALT_ES" || -n "$ALT_EN" ]]; then
  ROWS="[]"
  [[ -n "$ALT_ES" ]] && ROWS=$(python3 -c "import json; r=json.loads('$ROWS'); r.append({'image_id':'$ROW_ID','locale':'es','alt_text':'''$ALT_ES'''}); print(json.dumps(r))")
  [[ -n "$ALT_EN" ]] && ROWS=$(python3 -c "import json; r=json.loads('$ROWS'); r.append({'image_id':'$ROW_ID','locale':'en','alt_text':'''$ALT_EN'''}); print(json.dumps(r))")
  echo "Updating $TRANSLATIONS_TABLE..."
  curl -s -o /dev/null -w "alt_text upsert: HTTP %{http_code}\n" -X POST \
    "$SUPABASE_URL/rest/v1/$TRANSLATIONS_TABLE?on_conflict=image_id,locale" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates,return=minimal" \
    -d "$ROWS"
fi

echo "Done: $STORAGE_PATH ($((OPTIMIZED_SIZE / 1024)) KB, $LICENSE, $AUTHOR)."
