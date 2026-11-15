import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import fs from "node:fs";
import pg from "pg";
const enabled=Boolean(process.env.AI_TEST_DATABASE_URL);
if(enabled&&process.env.AI_TEST_DATABASE_URL!==process.env.DATABASE_URL)throw new Error("Use an isolated database");

test("file generation migration preserves completed files and hides old incomplete bytes",{skip:!enabled},async()=>{
 const schema=`file_upgrade_${randomUUID().replaceAll("-","")}`;
 assert.match(schema,/^file_upgrade_[a-f0-9]+$/);
 const client=new pg.Client({connectionString:process.env.AI_TEST_DATABASE_URL});await client.connect();
 try{
  await client.query(`CREATE SCHEMA "${schema}"`);await client.query(`SET search_path TO "${schema}", public`);
  await client.query(`
   CREATE TABLE generated_files (id TEXT PRIMARY KEY,"ownerId" TEXT NOT NULL,source TEXT NOT NULL,"deletionPending" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE ai_reference_scopes (id TEXT PRIMARY KEY,"deploymentId" TEXT);
   CREATE TABLE ai_datasets (id TEXT PRIMARY KEY,"scopeId" TEXT);
   CREATE TABLE automation_executions (id TEXT PRIMARY KEY,"organizationId" TEXT);
   CREATE TABLE ai_export_requests (id TEXT PRIMARY KEY,"userId" TEXT,"datasetId" TEXT,format TEXT,status TEXT,"proposalId" TEXT,"executionId" TEXT,"fileId" TEXT,"expiresAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3));
   INSERT INTO ai_reference_scopes VALUES ('scope','legacy-deployment');
   INSERT INTO ai_datasets VALUES ('dataset','scope');
   INSERT INTO automation_executions VALUES ('ready-execution','execution-fallback'),('pending-execution','execution-fallback');
   INSERT INTO ai_export_requests VALUES
    ('ready-request','owner','dataset','csv','READY','ready-proposal','ready-execution','ready-file','2026-11-15 12:00:00','2026-11-15 11:00:00'),
    ('pending-request','owner','dataset','xlsx','QUEUED','pending-proposal','pending-execution',NULL,'2026-11-15 12:00:00','2026-11-15 11:00:00');
   INSERT INTO generated_files(id,"ownerId",source) VALUES ('ready-file','owner','members.dues'),('pending-request','owner','members.dues'),('unrelated-file','owner','ai');
  `);
  await client.query(fs.readFileSync("prisma/schema/migrations/20261115094500_file_generations/migration.sql","utf8"));
  const generations=(await client.query('SELECT * FROM file_generations ORDER BY id')).rows;
  assert.equal(generations.length,2);assert.ok(generations.every(row=>row.organizationId==="legacy-deployment"));
  assert.equal(generations.find(row=>row.id==="ready-request").fileId,"ready-file");
  assert.equal(generations.find(row=>row.id==="pending-request").executionId,"pending-execution");
  const files=(await client.query('SELECT * FROM generated_files')).rows;
  assert.equal(files.find(row=>row.id==="ready-file").publicationPending,false);
  assert.equal(files.find(row=>row.id==="ready-file").deletionPending,false);
  assert.equal(files.find(row=>row.id==="pending-request").publicationPending,true);
  assert.equal(files.find(row=>row.id==="pending-request").deletionPending,true);
  assert.equal(files.find(row=>row.id==="unrelated-file").generationId,null);
  assert.equal(files.find(row=>row.id==="unrelated-file").publicationPending,false);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM ai_export_requests')).rows[0].count,2);
 }finally{
  await client.query('SET search_path TO public');await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await client.end();
 }
});
