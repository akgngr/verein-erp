import test from "node:test";
import assert from "node:assert/strict";
import {aiListPage,aiPageInfo} from "@/shared/ai/pagination";
test("live list cursors are bounded and partial lists never claim completeness",()=>{
 assert.equal(aiListPage(),1);assert.equal(aiListPage("2"),2);
 for(const cursor of ["0","-1","10000","1 OR 1=1","NaN"])assert.throws(()=>aiListPage(cursor));
 assert.deepEqual(aiPageInfo(1,50,51),{page:1,pageSize:50,total:51,hasMore:true,nextCursor:"2",completeness:"partial"});
 assert.equal(aiPageInfo(2,50,51).completeness,"partial");assert.equal(aiPageInfo(2,50,51).hasMore,false);
 assert.equal(aiPageInfo(1,50,20).completeness,"complete");
});
