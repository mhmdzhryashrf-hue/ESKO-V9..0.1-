import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const root=path.resolve(new URL('..',import.meta.url).pathname);const dataDir=await mkdtemp(path.join(os.tmpdir(),'esko-platform-'));let child,output='',base='';
async function start(){output='';child=spawn(process.execPath,[path.join(root,'backend/server.mjs')],{cwd:root,env:{...process.env,PORT:'',ESKO_HOST:'127.0.0.1',ESKO_PORT:'0',ESKO_DATA_DIR:dataDir,NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);const until=Date.now()+8000;while(Date.now()<until){const m=output.match(/http:\/\/127\.0\.0\.1:(\d+)/);if(m)return `http://127.0.0.1:${m[1]}`;if(child.exitCode!==null)throw Error(output);await new Promise(r=>setTimeout(r,40))}throw Error('server timeout '+output)}
async function stop(){if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r))}}
async function call(route,{method='GET',body,cookie}={}){const r=await fetch(base+route,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json().catch(()=>({})),cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie}}
try{
 base=await start();const health=await call('/api/health');assert.equal(health.status,200);
 const unauthPost=await call('/api/posts',{method:'POST',body:{text:'not signed in'}});assert.equal(unauthPost.status,401);
 const reg=await call('/api/account/register',{method:'POST',body:{displayName:'Platform Tester',username:'platform_test',age:16,password:'PlatformStrongPass890'}});assert.equal(reg.status,201);const cookie=reg.cookie;
 const second=await call('/api/account/register',{method:'POST',body:{displayName:'Second Tester',username:'platform_second',age:16,password:'SecondStrongPass890'}});assert.equal(second.status,201);const secondCookie=second.cookie;
 const create=await call('/api/posts',{method:'POST',cookie,body:{text:'منشور ESKO تجريبي آمن <script>alert(1)</script>',kind:'text'}});assert.equal(create.status,201);const id=create.data.post.id;
 const foreignDelete=await call(`/api/posts/${id}`,{method:'DELETE',cookie:secondCookie});assert.equal(foreignDelete.status,403);
 const publicFeed=await call('/api/posts?q=تجريبي');assert.equal(publicFeed.status,200);assert.ok(publicFeed.data.posts.some(p=>p.id===id));assert.ok(publicFeed.data.posts[0].text.includes('<script>'));
 const like=await call(`/api/posts/${id}/like`,{method:'POST',cookie,body:{}});assert.equal(like.status,200);assert.equal(like.data.likeCount,1);
 const comment=await call(`/api/posts/${id}/comments`,{method:'POST',cookie,body:{text:'تعليق آمن'}});assert.equal(comment.status,201);
 const invalidImage=await call('/api/posts',{method:'POST',cookie,body:{text:'رابط غير آمن',kind:'image',linkUrl:'http://images.example.test/photo.webp'}});assert.equal(invalidImage.status,400);
 const videoPost=await call('/api/posts',{method:'POST',cookie,body:{text:'فيديو اختبار',kind:'video',linkUrl:'https://media.example.test/video.mp4'}});assert.equal(videoPost.status,201);
 const imagePost=await call('/api/posts',{method:'POST',cookie,body:{text:'صورة اختبار',kind:'image',linkUrl:'https://images.example.test/photo.webp'}});assert.equal(imagePost.status,201);const imageFeed=await call('/api/posts?kind=image');assert.equal(imageFeed.status,200);assert.ok(imageFeed.data.posts.some(p=>p.id===imagePost.data.post.id));
 const report=await call(`/api/posts/${id}/report`,{method:'POST',cookie,body:{reason:'اختبار بلاغ المحتوى'}});assert.equal(report.status,201);const duplicateReport=await call(`/api/posts/${id}/report`,{method:'POST',cookie,body:{reason:'بلاغ مكرر'}});assert.equal(duplicateReport.status,409);
 const comments=await call(`/api/posts/${id}/comments`);assert.equal(comments.status,200);assert.equal(comments.data.comments.length,1);
 const repo=await call('/api/repos',{method:'POST',cookie,body:{name:'My Project',description:'Private test repo',language:'JavaScript'}});assert.equal(repo.status,201);const rid=repo.data.repository.id;
 const saveFile=await call(`/api/repos/${rid}/files`,{method:'POST',cookie,body:{path:'src/app.js',content:'console.log("ESKO");'}});assert.equal(saveFile.status,200);
 const repoData=await call(`/api/repos/${rid}`,{cookie});assert.equal(repoData.status,200);assert.equal(repoData.data.files[0].path,'src/app.js');
 const readFileResult=await call(`/api/repos/${rid}/files?path=${encodeURIComponent('src/app.js')}`,{cookie});assert.equal(readFileResult.status,200);assert.equal(readFileResult.data.file.content,'console.log("ESKO");');
 const missingFile=await call(`/api/repos/${rid}/files?path=${encodeURIComponent('missing.js')}`,{cookie});assert.equal(missingFile.status,404);
 const badPath=await call(`/api/repos/${rid}/files`,{method:'POST',cookie,body:{path:'../secret',content:'x'}});assert.equal(badPath.status,400);
 const crossAccount=await call(`/api/repos/${rid}`,{cookie:secondCookie});assert.equal(crossAccount.status,404);
 const privateList=await call('/api/repos');assert.equal(privateList.status,401);
 const store=await call('/api/store/products');assert.equal(store.status,200);assert.ok(Array.isArray(store.data.products));assert.equal(store.data.checkoutEnabled,false);
 const saved=JSON.parse(await readFile(path.join(dataDir,'database.json'),'utf8'));assert.ok(saved.posts.length===3);assert.ok(saved.repositories.length===1);assert.ok(saved.reports.some(x=>x.type==='post'));assert.ok(!JSON.stringify(saved).includes(cookie.split('=')[1]));
 console.log('PASS: public feed search, authenticated text/image/video-link posts, HTTPS-only media validation, likes/comments, cross-account delete denial, duplicate-safe reports, owner-private repositories, cross-account isolation, path traversal rejection, read-only store catalogue, and hashed session persistence.');
}finally{await stop();await rm(dataDir,{recursive:true,force:true})}
