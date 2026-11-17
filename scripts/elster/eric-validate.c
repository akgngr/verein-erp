/*
 * ELSTER-2: validate ELSTER XML files with ERiC **without sending** (ERIC_VALIDIERE only).
 * Build (CI): gcc eric-validate.c -I$ERIC/include -L$ERIC/lib -lericapi -Wl,-rpath,$ERIC/lib -o eric-validate
 * Usage: eric-validate <datenartVersion e.g. UStVA_2026> <log-dir> <file.xml>...
 * Exit code: number of files ERiC rejected (0 = all plausible).
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "ericapi.h"

static char *read_file(const char *path) {
  FILE *file = fopen(path, "rb");
  if (!file) return NULL;
  fseek(file, 0, SEEK_END);
  long size = ftell(file);
  rewind(file);
  char *buffer = malloc((size_t)size + 1);
  if (buffer && fread(buffer, 1, (size_t)size, file) != (size_t)size) { free(buffer); buffer = NULL; }
  if (buffer) buffer[size] = '\0';
  fclose(file);
  return buffer;
}

int main(int argc, char **argv) {
  if (argc < 4) {
    fprintf(stderr, "usage: %s <datenartVersion> <log-dir> <file.xml>...\n", argv[0]);
    return 2;
  }
  int rc = EricInitialisiere(NULL, argv[2]);
  if (rc != ERIC_OK) {
    fprintf(stderr, "EricInitialisiere failed: %d\n", rc);
    return 2;
  }
  int failures = 0;
  for (int i = 3; i < argc; i++) {
    char *xml = read_file(argv[i]);
    if (!xml) { fprintf(stderr, "cannot read %s\n", argv[i]); failures++; continue; }
    EricRueckgabepufferHandle result = EricRueckgabepufferErzeugen();
    EricRueckgabepufferHandle server = EricRueckgabepufferErzeugen();
    rc = EricBearbeiteVorgang(xml, argv[1], ERIC_VALIDIERE, NULL, NULL, NULL, result, server);
    if (rc == ERIC_OK) {
      printf("%-50s plausible\n", argv[i]);
    } else {
      EricRueckgabepufferHandle text = EricRueckgabepufferErzeugen();
      EricHoleFehlerText(rc, text);
      printf("%-50s REJECTED (%d) %s\n", argv[i], rc, EricRueckgabepufferInhalt(text));
      printf("%s\n", EricRueckgabepufferInhalt(result));
      EricRueckgabepufferFreigeben(text);
      failures++;
    }
    EricRueckgabepufferFreigeben(result);
    EricRueckgabepufferFreigeben(server);
    free(xml);
  }
  EricBeende();
  return failures;
}
