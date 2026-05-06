#!/bin/sh

set -e

wd=`echo "$PWD" | sed 's/\/database$//'`/database

# Respect DATABASE_URL from the environment (CI, one-off shells). Otherwise load
# server/.env so `pnpm run db:import` works from the repo root without exporting.
if [ -z "$DATABASE_URL" ]; then
  if [ -f "$wd"/../server/.env ]; then
    set -a
    . "$wd"/../server/.env
    set +a
  else
    echo 'no DATABASE_URL set and no .env file found at '"$wd"'/../server/.env' 1>&2
    exit 1
  fi
fi

if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" \
    -f "$wd"/schema.sql \
    -f "$wd"/data.sql \
    -f "$wd"/drizzle-baseline-after-import.sql
else
  echo 'no DATABASE_URL environment variable set' 1>&2
  exit 1
fi
