import test from "node:test";
import assert from "node:assert/strict";
import {resolveTaskAssigneeIds} from "@/modules/tasks/queries/assignee-identity";
test("AI's explicit empty identity set never falls back to shared email or user/member ID coincidence",async()=>{
 let lookups=0;
 const lookup=async()=>{lookups++;return ["same-name-or-email-member"];};
 assert.deepEqual(await resolveTaskAssigneeIds({id:"same-id",email:"shared@example.test",verifiedMemberIds:[]},lookup),[]);
 assert.equal(lookups,0);
 assert.deepEqual(await resolveTaskAssigneeIds({id:"u",email:"shared@example.test",verifiedMemberIds:["verified-member","verified-member"]},lookup),["verified-member"]);
 assert.equal(lookups,0);
});
