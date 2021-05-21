#!/bin/bash
cd "$(dirname "$0")"

cd ../data

IMPORT_COMMAND=""

for FILE in *.csv; do
  DB_NAME="${FILE/.csv/}"

  IMPORT_COMMAND="${IMPORT_COMMAND}
.import $FILE $DB_NAME"

done

## https://github.com/darrentu/convert-db-to-csv/blob/master/convert-db-to-csv.sh
sqlite3 <<EOF
.mode csv
$IMPORT_COMMAND
.save currencies.db
EOF
