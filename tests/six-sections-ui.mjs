import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../public/style.css',import.meta.url),'utf8');
const js=await readFile(new URL('../public/six-sections.js',import.meta.url),'utf8');
const navOrder=[...html.matchAll(/data-section="(home|store|repositories|assistant|sections|account)"/g)].map(m=>m[1]);
assert.deepEqual(navOrder,['home','store','repositories','assistant','sections','account'],'bottom navigation order and uniqueness');
assert.match(html,/aria-label="التنقل الرئيسي"/);
for(const section of ['home','store','repositories','assistant','sections','account']){
  assert.match(html,new RegExp(`id="page-${section}"`),`page ${section}`);
}
assert.match(html,/id="postFeed"/);assert.match(html,/id="createPostForm"/);assert.match(html,/value="image"/);assert.match(html,/id="savePostDraft"/);assert.match(html,/data-feed-kind="image"/);assert.match(html,/id="storeProducts"/);assert.match(html,/id="repoWorkspace"/);assert.match(html,/id="assistantHistory"/);
assert.match(css,/\.bottom-nav\s*\{/);assert.match(css,/safe-area-inset-bottom/);
assert.match(js,/\/posts/);assert.match(js,/\/repos/);assert.match(js,/homePostDraft/);assert.match(js,/post-media-image/);assert.match(js,/مشاركة/);assert.match(js,/checkoutEnabled/);
console.log('PASS: six fixed navigation sections, semantic pages, home composer/feed, store, repositories and assistant hooks.');
