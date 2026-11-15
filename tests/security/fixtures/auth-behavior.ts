import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { encode, decode } from "next-auth/jwt";
import { authConfig } from "@/modules/auth/edge";
import { SESSION_MAX_AGE_SECONDS, tokenToSessionUser } from "@/modules/auth/services/session";
import { can, definePermissions } from "@/shared/permissions/define";

const secret="isolated-auth-test-secret-with-sufficient-length";
const salt="authjs.session-token";
const user={id:"test-user",name:"Test",email:"test@example.test",role:"VIEWER",mustChangePassword:false};
const authorize=(path:string,sessionUser:typeof user|null)=>authConfig.callbacks.authorized({auth:sessionUser?{user:sessionUser,expires:new Date(Date.now()+60000).toISOString()}:null,request:new NextRequest(`https://erp.example.test${path}`)} as never);

describe("Authentication bypass protection with real Auth.js behavior",()=>{
 test("unauthenticated panel requests redirect, login remains accessible",async()=>{
  for(const path of ["/","/panel","/uyeler","/evrak"]){const result=await authorize(path,null);assert.ok(result instanceof Response);assert.equal(result.status,307);assert.equal(result.headers.get("location"),"https://erp.example.test/giris");}
  assert.equal(await authorize("/giris",null),true);
  assert.equal(await authorize("/panel",user),true);
 });
 test("mandatory password change permits only profile; passive notice breaks redirect loops",async()=>{
  const changed={...user,mustChangePassword:true};
  const result=await authorize("/panel",changed);assert.ok(result instanceof Response);assert.equal(result.headers.get("location"),"https://erp.example.test/profil");
  assert.equal(await authorize("/profil",changed),true);
  assert.equal(await authorize("/giris?pasif=1",user),true);
 });
 test("real encrypted tokens reject tampering, wrong key, wrong cookie salt and expiry",async()=>{
  const token=await encode({secret,salt,token:user,maxAge:SESSION_MAX_AGE_SECONDS});
  assert.equal((await decode({secret,salt,token}))?.id,user.id);
  const parts=token.split(".");parts[3]=(parts[3][0]==="A"?"B":"A")+parts[3].slice(1);
  for(const candidate of [parts.join("."),"invalid.token","null"]){await assert.rejects(decode({secret,salt,token:candidate}));}
  assert.equal(await decode({secret,salt,token:""}),null);
  await assert.rejects(decode({secret:"incorrect-secret",salt,token}));
  await assert.rejects(decode({secret,salt:"wrong-cookie",token}));
  const expired=await encode({secret,salt,token:user,maxAge:-120});await assert.rejects(decode({secret,salt,token:expired}));
 });
 test("HTTPS session handler emits HttpOnly, Secure, SameSite=Lax cookies",async()=>{
  const secureSalt="__Secure-authjs.session-token";
  const token=await encode({secret,salt:secureSalt,token:user,maxAge:SESSION_MAX_AGE_SECONDS});
  const auth=NextAuth({...authConfig,secret,basePath:"/api/auth"});
  const response=await auth.handlers.GET(new NextRequest("https://erp.example.test/api/auth/session",{headers:{cookie:`${secureSalt}=${token}`}}));
  const body=await response.json();assert.equal(body.user.id,user.id);
  const cookie=response.headers.get("set-cookie")??"";
  assert.match(cookie,/HttpOnly/i);assert.match(cookie,/Secure/i);assert.match(cookie,/SameSite=Lax/i);
 });
 test("session mapping rejects missing identity or role and defaults to password renewal",()=>{
  assert.equal(tokenToSessionUser({role:"VIEWER"}),null);
  assert.equal(tokenToSessionUser({id:"u"}),null);
  assert.equal(tokenToSessionUser({id:"u",role:"VIEWER"})?.mustChangePassword,true);
 });
 test("permission checks enforce role-specific actions",()=>{
  const permissions=definePermissions("test",{ADMIN:["view","create","update","delete"],BOARD:["view","create"],SECRETARY:["view"],TREASURER:["view"],AUDITOR:["view"],VIEWER:["view"]});
  assert.equal(can("ADMIN",permissions,"delete"),true);assert.equal(can("BOARD",permissions,"create"),true);
  assert.equal(can("BOARD",permissions,"delete"),false);assert.equal(can("VIEWER",permissions,"create"),false);
 });
 test("inactive accounts cannot authenticate",async()=>{
  const {getLoginAccessStatus}=await import("@/shared/security/login-lockout");
  assert.equal(getLoginAccessStatus(false,null,new Date()),"inactive");
 });
});
