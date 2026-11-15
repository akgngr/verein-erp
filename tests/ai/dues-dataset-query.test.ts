import test from "node:test";
import assert from "node:assert/strict";
import { parseDuesDatasetQuery, matchesDuesDatasetAmount } from "@/modules/members/services/dues-dataset-query";

test("dataset query rejects identity selectors, SQL fragments, unsupported fields and invalid money ranges", () => {
  for (const query of [{year:2026,name:"private"},{year:2026,sql:"1=1"},{year:2026,status:"DROP TABLE"},{year:2026,minimumRemainingCents:0.1},{year:2026,minimumRemainingCents:10,maximumRemainingCents:9}]) {
    assert.throws(()=>parseDuesDatasetQuery(query));
  }
  const query=parseDuesDatasetQuery({year:2026,status:"PARTIAL",minimumRemainingCents:100,maximumRemainingCents:200});
  assert.equal(matchesDuesDatasetAmount(99,query),false);
  assert.equal(matchesDuesDatasetAmount(100,query),true);
  assert.equal(matchesDuesDatasetAmount(200,query),true);
  assert.equal(matchesDuesDatasetAmount(201,query),false);
});
