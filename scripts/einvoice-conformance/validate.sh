#!/usr/bin/env bash
# Validates the generated corpus. Fails on any "invalid" result; warnings/notices are reported only.
#   validate.sh <corpus-dir> <mustang-cli.jar> [kosit-validator.jar kosit-scenarios-dir]
set -euo pipefail
CORPUS="$1"; MUSTANG="$2"; KOSIT_JAR="${3:-}"; KOSIT_CONF="${4:-}"
REPORTS="$CORPUS/reports"; mkdir -p "$REPORTS"
failed=0

for file in "$CORPUS"/xrechnung-ubl/*.xml "$CORPUS"/cii/*.xml "$CORPUS"/zugferd/*.pdf; do
  name="$(basename "$(dirname "$file")")-$(basename "$file")"
  report="$REPORTS/mustang-$name.xml"
  java -jar "$MUSTANG" --disable-file-logging --no-notices --action validate --source "$file" > "$report" 2>/dev/null || true
  status=$(grep -oE '<summary status="[a-z]+"' "$report" | tail -1 | sed -E 's/.*"([a-z]+)"/\1/')
  findings=$(grep -cE '<(error|warning|notice|fatal)' "$report" || true)
  printf '%-40s mustang=%-8s findings=%s\n' "$name" "${status:-none}" "$findings"
  grep -oE '\[(BR|PEPPOL|CII|UBL)[^]]*\]' "$report" | sort -u | sed 's/^/    /' || true
  if [ "${status:-}" != "valid" ]; then failed=1; fi
done

if [ -n "$KOSIT_JAR" ]; then
  # Official KoSIT validator with the XRechnung configuration (UBL corpus). One report per file;
  # a report containing <rep:reject> means "not acceptable".
  KOSIT_OUT="$REPORTS/kosit"; mkdir -p "$KOSIT_OUT"
  # 1.6.x ships validator-<v>.jar without Main-Class plus libs/; older releases have a runnable standalone jar.
  if unzip -p "$KOSIT_JAR" META-INF/MANIFEST.MF 2>/dev/null | grep -q '^Main-Class:'; then
    KOSIT_CMD=(java -jar "$KOSIT_JAR")
  else
    KOSIT_CMD=(java -cp "$KOSIT_JAR:$(dirname "$KOSIT_JAR")/libs/*" de.kosit.validationtool.cmd.CommandLineApplication)
  fi
  "${KOSIT_CMD[@]}" -s "$KOSIT_CONF/scenarios.xml" -r "$KOSIT_CONF" -o "$KOSIT_OUT" "$CORPUS"/xrechnung-ubl/*.xml | tee "$REPORTS/kosit.log" || true
  # KoSIT prints "Acceptable: N  Rejected: M"; reports with <rep:reject> are listed for diagnosis.
  summary=$(grep -oE 'Acceptable:[[:space:]]*[0-9]+[[:space:]]+Rejected:[[:space:]]*[0-9]+' "$REPORTS/kosit.log" | tail -1 || true)
  acceptable=$(echo "$summary" | sed -nE 's/.*Acceptable:[[:space:]]*([0-9]+).*/\1/p')
  rejected=$(echo "$summary" | sed -nE 's/.*Rejected:[[:space:]]*([0-9]+).*/\1/p')
  expected=$(find "$CORPUS"/xrechnung-ubl -name '*.xml' | wc -l)
  echo "kosit: acceptable=${acceptable:-?} rejected=${rejected:-?} expected=$expected"
  for report in $(grep -l '<rep:reject' "$KOSIT_OUT"/*.xml 2>/dev/null || true); do
    echo "  rejected: $(basename "$report")"
    { grep -oE 'code="[^"]+"' "$report" || true; } | sort -u | sed 's/^/    /'
  done
  if [ "${acceptable:-0}" != "$expected" ] || [ "${rejected:-1}" != "0" ]; then failed=1; fi
fi

exit $failed
