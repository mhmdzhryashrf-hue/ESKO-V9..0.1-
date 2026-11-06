(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const API = String(window.ESKO_API_BASE || '/api').replace(/\/$/, '');
  const api = async (path, options = {}) => {
    const requestUrl = new URL(`${API}${path}`, location.href);
    let response;
    try {
      response = await fetch(requestUrl.href, {
        method: options.method || 'GET',
        credentials: requestUrl.origin === location.origin ? 'same-origin' : 'include',
        headers: options.body ? {'Content-Type':'application/json'} : {},
        body: options.body ? JSON.stringify(options.body) : undefined
      });
    } catch {
      throw new Error('تعذر الاتصال بخادم ESKO. تحقق من إعداد ESKO_API_BASE وتشغيل خادم API.');
    }
    const type = response.headers.get('content-type') || '';
    const data = type.includes('application/json') ? await response.json().catch(()=>({})) : {};
    if (!response.ok) throw new Error(data.error || `تعذر تنفيذ الطلب (${response.status}).`);
    if (!type.includes('application/json')) throw new Error('استجابة الخادم غير صالحة؛ المتوقع JSON.');
    return data;
  };
  const textNode = (tag, className, value) => { const el=document.createElement(tag); if(className)el.className=className; if(value!==undefined)el.textContent=value; return el; };
  let activeFeedKind='all'; let selectedRepo=null; let currentUser=null; let products=[];

  async function session(){ try { const r=await api('/account/me'); currentUser=r.user; } catch { currentUser=null; } return currentUser; }
  function navSectionFor(page){ return ({home:'home',store:'store',repositories:'repositories',assistant:'assistant',sections:'sections',account:'account',settings:'account',about:'sections',processor:'assistant',support:'sections',notes:'account',memory:'account',termux:'sections',scanner:'sections',disclaimer:'account',discussions:'home'})[page] || 'sections'; }
  function activate(page){
    const target=$(`#page-${page}`); if(!target)return;
    $$('.page').forEach(el=>el.classList.toggle('active',el===target));
    $$('.nav-item').forEach(btn=>btn.classList.toggle('active',btn.dataset.page===page));
    const sec=navSectionFor(page);
    $$('.bottom-nav-item').forEach(btn=>{const active=btn.dataset.section===sec;btn.classList.toggle('active',active);if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');});
    $('#sideMenu')?.classList.remove('open');$('#menuShade')?.classList.remove('show');$('#menuToggle')?.setAttribute('aria-expanded','false');
    window.scrollTo({top:0,behavior:document.body.classList.contains('no-motion')?'auto':'smooth'});
    onNavigate(page);
  }

  async function loadPosts(){
    const feed=$('#postFeed'),status=$('#feedStatus'); if(!feed||!status)return;
    status.textContent='جارٍ تحميل الخلاصة...'; feed.replaceChildren();
    const query=$('#feedSearchInput')?.value.trim()||'';
    const params=new URLSearchParams();if(query)params.set('q',query);if(activeFeedKind!=='all')params.set('kind',activeFeedKind);
    try{
      const result=await api(`/posts?${params.toString()}`); const posts=result.posts||[];
      status.textContent=posts.length?`عرض ${posts.length} منشورًا.`:'لا توجد منشورات مطابقة بعد. ابدأ أول مشاركة في ESKO.';
      for(const post of posts)feed.append(renderPost(post));
    }catch(error){status.textContent=`تعذر تحميل الخلاصة: ${error.message}`;feed.append(textNode('div','empty-state','تأكد من تشغيل خادم ESKO.'))}
  }
  function renderPost(post){
    const card=textNode('article','post-card panel');
    const head=textNode('div','post-card-head'); const avatar=textNode('span','post-avatar',(post.displayName||post.username||'E').slice(0,1).toUpperCase());
    const author=textNode('div','post-author');author.append(textNode('b','',post.displayName||post.username),textNode('small','',`@${post.username||'esko'}`));
    const meta=textNode('time','post-date',new Date(post.createdAt).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}));head.append(avatar,author,meta);
    const label = post.kind==='video' ? 'رابط فيديو' : post.kind==='image' ? 'صورة خارجية' : 'منشور';
    const type=textNode('span','post-type',label);const body=textNode('p','post-text',post.text);card.append(head,type,body);
    if(post.linkUrl && post.kind==='image'){
      const media=textNode('img','post-media-image');media.src=post.linkUrl;media.alt='صورة مرفقة بالمنشور';media.loading='lazy';media.referrerPolicy='no-referrer';card.append(media);
    } else if(post.linkUrl && post.kind==='video' && /\.mp4(?:$|[?#])/i.test(post.linkUrl)){
      const media=textNode('video','post-media-video');media.src=post.linkUrl;media.controls=true;media.playsInline=true;media.preload='metadata';card.append(media);
    } else if(post.linkUrl){
      const link=textNode('a','post-external-link',post.kind==='video'?'مشاهدة الفيديو على المصدر ↗':'فتح الرابط ↗');link.href=post.linkUrl;link.target='_blank';link.rel='noopener noreferrer';card.append(link);
    }
    const actions=textNode('div','post-actions');
    const like=textNode('button',post.likedByViewer?'post-action liked':'post-action',`♥ ${post.likeCount||0} إعجاب`);like.type='button';like.addEventListener('click',async()=>{try{await api(`/posts/${encodeURIComponent(post.id)}/like`,{method:'POST',body:{}});await loadPosts()}catch(e){window.alert(e.message)}});
    const comment=textNode('button','post-action',`تعليق ${post.commentCount||0}`);comment.type='button';comment.addEventListener('click',async()=>{
      try{const result=await api(`/posts/${encodeURIComponent(post.id)}/comments`);const lines=(result.comments||[]).map(c=>`${c.displayName||c.username}: ${c.text}`).join('\n');const value=window.prompt(`التعليقات الحالية:\n${lines||'لا توجد تعليقات.'}\n\nاكتب تعليقًا جديدًا:`);if(value?.trim()){await api(`/posts/${encodeURIComponent(post.id)}/comments`,{method:'POST',body:{text:value.trim()}});await loadPosts()}}catch(e){window.alert(e.message)}
    });
    const share=textNode('button','post-action','مشاركة ↗');share.type='button';share.addEventListener('click',async()=>{const shareText=`${post.displayName||post.username}: ${post.text}${post.linkUrl?'\n'+post.linkUrl:''}`;try{if(navigator.share)await navigator.share({title:'منشور ESKO',text:shareText});else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(shareText);window.alert('تم نسخ نص المنشور لمشاركته.')}else window.alert(shareText)}catch(e){if(e?.name!=='AbortError')window.alert('تعذرت المشاركة من هذا المتصفح.')}});
    const report=textNode('button','post-action','إبلاغ');report.type='button';report.addEventListener('click',async()=>{const reason=window.prompt('اكتب سبب الإبلاغ عن المنشور:');if(!reason?.trim())return;try{await api(`/posts/${encodeURIComponent(post.id)}/report`,{method:'POST',body:{reason:reason.trim()}});window.alert('تم تسجيل البلاغ للمراجعة.')}catch(e){window.alert(e.message)}});
    actions.append(like,comment,share,report);
    if(currentUser?.username===post.username){const remove=textNode('button','post-action post-delete','حذف');remove.type='button';remove.addEventListener('click',async()=>{if(!confirm('حذف هذا المنشور؟'))return;try{await api(`/posts/${encodeURIComponent(post.id)}`,{method:'DELETE'});await loadPosts()}catch(e){window.alert(e.message)}});actions.append(remove)}
    card.append(actions);return card;
  }
  async function createPost(event){
    event.preventDefault();const text=$('#postText').value.trim();const kind=$('#postKind').value;const linkUrl=$('#postLink').value.trim();
    if(!text)return;try{await api('/posts',{method:'POST',body:{text,kind,linkUrl}});$('#createPostForm').reset();await window.ESKOStore.set('settings','homePostDraft',null).catch(()=>{});$('#postComposeStatus').textContent='تم نشر منشورك على خلاصة ESKO.';await loadPosts()}catch(e){$('#postComposeStatus').textContent=e.message;if(e.message.includes('سجّل الدخول'))activate('account')}
  }

  function renderProducts(list){
    const root=$('#storeProducts');root.replaceChildren();
    if(!list.length){root.append(textNode('div','empty-state panel','لا توجد منتجات منشورة في كتالوج المتجر حاليًا. لن نعرض منتجات تجريبية على أنها متاحة للبيع.'));return}
    for(const product of list){const card=textNode('article','product-card panel');card.append(textNode('h3','',product.name),textNode('p','',product.description||'بدون وصف'),textNode('b','product-price',`${product.price} ${product.currency||'EGP'}`),textNode('small','',`المخزون: ${product.stock}`));const add=textNode('button','small-button','إضافة للسلة');add.type='button';add.disabled=Number(product.stock)<=0;add.addEventListener('click',()=>addToCart(product));card.append(add);root.append(card)}
  }
  async function loadStore(){
    const status=$('#storeStatus');if(!status)return;status.textContent='جارٍ تحميل قائمة المنتجات...';
    try{const q=$('#storeSearchInput')?.value.trim()||'';const result=await api(`/store/products${q?`?q=${encodeURIComponent(q)}`:''}`);products=result.products||[];renderProducts(products);status.textContent=products.length?`${products.length} منتج منشور · الدفع ${result.checkoutEnabled?'متاح بعد الاختبار':'غير مفعّل'}`:'الكتالوج متاح، لكن لا توجد منتجات منشورة بعد.';renderCart()}catch(e){status.textContent=e.message;renderProducts([])}
  }
  async function getCart(){try{return await window.ESKOStore.get('cart','items')||[]}catch{return []}}
  async function addToCart(product){const cart=await getCart();const old=cart.find(x=>x.id===product.id);if(old)old.quantity=Math.min(99,old.quantity+1);else cart.push({id:product.id,name:product.name,price:product.price,currency:product.currency,quantity:1});await window.ESKOStore.set('cart','items',cart);renderCart()}
  async function renderCart(){const cart=await getCart();const root=$('#cartItems');root.replaceChildren();$('#cartStatus').textContent=cart.length?`عدد المنتجات: ${cart.reduce((n,x)=>n+x.quantity,0)}`:'سلتك فارغة حتى الآن.';for(const item of cart){const row=textNode('div','cart-row',`${item.name} × ${item.quantity} — ${item.price} ${item.currency}`);const remove=textNode('button','text-button','إزالة');remove.type='button';remove.addEventListener('click',async()=>{await window.ESKOStore.set('cart','items',cart.filter(x=>x.id!==item.id));renderCart()});row.append(remove);root.append(row)}}

  async function loadRepositories(){
    const root=$('#repoList');if(!root)return;root.textContent='جارٍ تحميل مستودعاتك...';
    try{await session();if(!currentUser){root.textContent='سجّل الدخول إلى حسابك حتى تحفظ مستودعاتك بصورة خاصة.';$('#repoStatus').textContent='يلزم تسجيل الدخول.';return}
      const result=await api('/repos');root.replaceChildren();$('#repoStatus').textContent=`مسجّل الدخول باسم @${currentUser.username}. الحد الأقصى 20 مستودعًا للحساب.`;
      if(!result.repositories.length){root.append(textNode('p','empty-state','لا توجد مستودعات بعد. أنشئ أول مشروع.'));return}
      for(const repo of result.repositories){const card=textNode('article','repo-item');const details=textNode('div','repo-details');details.append(textNode('b','',repo.name),textNode('small','',`${repo.language} · ${repo.fileCount} ملف · ${repo.description||'بدون وصف'}`));const open=textNode('button','small-button','فتح');open.type='button';open.addEventListener('click',()=>openRepository(repo.id));const remove=textNode('button','text-button','حذف');remove.type='button';remove.addEventListener('click',async()=>{if(!confirm(`حذف المستودع ${repo.name} وكل ملفاته؟`))return;try{await api(`/repos/${encodeURIComponent(repo.id)}`,{method:'DELETE'});await loadRepositories();if(selectedRepo===repo.id){selectedRepo=null;$('#repoWorkspace').classList.add('hidden')}}catch(e){alert(e.message)}});card.append(details,open,remove);root.append(card)}
    }catch(e){root.textContent=e.message;$('#repoStatus').textContent=e.message}
  }
  async function createRepository(event){event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget).entries());try{await api('/repos',{method:'POST',body:data});event.currentTarget.reset();await loadRepositories()}catch(e){$('#repoStatus').textContent=e.message}}
  async function openRepository(id){selectedRepo=id;try{const result=await api(`/repos/${encodeURIComponent(id)}`);$('#repoWorkspace').classList.remove('hidden');$('#repoWorkspaceTitle').textContent=result.repository.name;$('#repoWorkspaceMeta').textContent=`${result.repository.language} · مستودع خاص`;$('[name="path"]',$('#repoFileForm')).value='';$('#repoFileForm').elements.content.value='';renderRepoFiles(result.files||[])}catch(e){alert(e.message)}}
  function renderRepoFiles(files){const root=$('#repoFileList');root.replaceChildren();if(!files.length){root.append(textNode('p','empty-state','المستودع فارغ؛ احفظ أول ملف نصي.'));return}for(const file of files){const row=textNode('div','repo-file-row');row.append(textNode('span','',`${file.path} · ${file.size} حرفًا`));const open=textNode('button','small-button','فتح / تعديل');open.type='button';open.addEventListener('click',async()=>{if(!selectedRepo)return;try{const result=await api(`/repos/${encodeURIComponent(selectedRepo)}/files?path=${encodeURIComponent(file.path)}`);$('[name="path"]',$('#repoFileForm')).value=result.file.path;$('#repoFileForm').elements.content.value=result.file.content;$('#repoStatus').textContent=`تم فتح ${result.file.path} للتحرير.`}catch(e){alert(e.message)}});const download=textNode('button','text-button','تنزيل');download.type='button';download.addEventListener('click',async()=>{if(!selectedRepo)return;try{const result=await api(`/repos/${encodeURIComponent(selectedRepo)}/files?path=${encodeURIComponent(file.path)}`);const blob=new Blob([result.file.content],{type:'text/plain;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=file.path.split('/').pop()||'esko-file.txt';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}catch(e){alert(e.message)}});const remove=textNode('button','text-button','حذف');remove.type='button';remove.addEventListener('click',async()=>{if(!selectedRepo)return;try{await api(`/repos/${encodeURIComponent(selectedRepo)}/files`,{method:'DELETE',body:{path:file.path}});await openRepository(selectedRepo)}catch(e){alert(e.message)}});row.append(open,download,remove);root.append(row)}}
  async function saveRepositoryFile(event){event.preventDefault();if(!selectedRepo)return;const data=Object.fromEntries(new FormData(event.currentTarget).entries());try{await api(`/repos/${encodeURIComponent(selectedRepo)}/files`,{method:'POST',body:data});event.currentTarget.elements.content.value='';await openRepository(selectedRepo);await loadRepositories()}catch(e){alert(e.message)}}

  function localAssistantAnswer(question,engine){const q=question.toLowerCase();if(engine==='code'){
    if(/console\.log/.test(q))return 'console.log() تطبع قيمة في وحدة التحكم. مثال: console.log("Hello ESKO");';
    if(/syntax|نحوي|خطأ|error/.test(q))return 'راجع الأقواس وعلامات الاقتباس والفواصل، ثم شغّل node --check اسم-الملف.js. أرسل نص الخطأ والسياق لتحديد السبب.';
    if(/termux|node|تشغيل/.test(q))return 'انتقل إلى مجلد المشروع أولًا، ثم افحص الصياغة بـ node --check. لا تشغّل ملفًا غير موثوق قبل مراجعته.';
    return 'مساعد البرمجة المحلي يقدم إرشادات عامة فقط. أرفق رسالة الخطأ أو مقطع الكود حتى أوجهك بدقة أكبر.';
  }
  if(/حساب|استرجاع|كلمة مرور/.test(q))return 'استخدم كلمة مرور فريدة ولا تشارك رمز الاسترجاع. استرجاع الحساب متاح من قسم الحساب عبر الخادم عند نشره.';
  if(/متجر|منتج|سلة/.test(q))return 'المتجر يعرض المنتجات المنشورة من خادم ESKO. لا يوجد دفع حقيقي في النسخة الحالية.';
  if(/مستودع|مشروع|كود/.test(q))return 'افتح المستودعات، أنشئ مشروعًا، ثم أضف ملفًا نصيًا. الملفات خاصة ولا يتم تنفيذها على الخادم.';
  return 'مساعد ESKO المحلي متاح للتوجيه إلى البيت والمتجر والمستودعات والأقسام والحساب. هذا محرك قواعد، وليس نموذجًا توليديًا.';
  }
  async function sendAssistant(event){event.preventDefault();const question=$('#assistantQuestion').value.trim();if(!question)return;const engine=$('#assistantEngine').value;const history=$('#assistantHistory');const q=textNode('div','assistant-message assistant-user',question);history.append(q);const answer=localAssistantAnswer(question,engine);const a=textNode('div','assistant-message assistant-response',answer);history.append(a);$('#assistantAnswer').textContent='تم إنشاء إجابة محلية. ليست إجابة صادرة عن نموذج توليدي.';$('#assistantQuestion').value='';history.scrollTop=history.scrollHeight;try{const prior=await window.ESKOStore.get('assistant','history')||[];prior.push({question,answer,engine,createdAt:new Date().toISOString()});await window.ESKOStore.set('assistant','history',prior.slice(-50))}catch{}}

  async function onNavigate(page){
    if(page==='home'||page==='discussions')await loadPosts();
    if(page==='store')await loadStore();
    if(page==='repositories')await loadRepositories();
    if(page==='assistant')await session();
    if(page==='account')await session();
  }
  function bind(){
    $$('.bottom-nav-item').forEach(btn=>btn.addEventListener('click',()=>activate(btn.dataset.section)));
    // Detail-page navigation is handled by the core app; watch active page changes to keep the dock in sync.
    const main=$('#mainContent');if(main){let lastObservedPage=$('.page.active',main)?.id||'';new MutationObserver(()=>{const page=$('.page.active',main);if(!page||page.id===lastObservedPage)return;lastObservedPage=page.id;const name=page.id.replace(/^page-/,'');const section=navSectionFor(name);$$('.bottom-nav-item').forEach(btn=>btn.classList.toggle('active',btn.dataset.section===section))}).observe(main,{subtree:true,attributes:true,attributeFilter:['class']})}
    $('#createPostForm')?.addEventListener('submit',createPost);
    $('#feedSearchForm')?.addEventListener('submit',e=>{e.preventDefault();loadPosts()});
    $('#refreshFeed')?.addEventListener('click',loadPosts);
    $$('[data-feed-kind]').forEach(btn=>btn.addEventListener('click',()=>{activeFeedKind=btn.dataset.feedKind;$$('[data-feed-kind]').forEach(x=>x.classList.toggle('active',x===btn));loadPosts()}));
    $('#postKind')?.addEventListener('change',()=>{const kind=$('#postKind').value;const media=kind==='video'||kind==='image';$('#postLink').required=media;$('#postLink').placeholder=kind==='video'?'رابط فيديو HTTPS (مطلوب)':kind==='image'?'رابط صورة HTTPS (مطلوب)':'رابط HTTPS (اختياري للنص)'});
    $('#savePostDraft')?.addEventListener('click',async()=>{const draft={text:$('#postText').value,kind:$('#postKind').value,linkUrl:$('#postLink').value};try{await window.ESKOStore.set('settings','homePostDraft',draft);$('#postComposeStatus').textContent='تم حفظ المسودة على هذا الجهاز فقط.'}catch{$('#postComposeStatus').textContent='تعذر حفظ المسودة محليًا.'}});
    window.ESKOStore.get('settings','homePostDraft').then(draft=>{if(draft){$('#postText').value=draft.text||'';$('#postKind').value=draft.kind||'text';$('#postLink').value=draft.linkUrl||'';$('#postKind').dispatchEvent(new Event('change'));$('#postComposeStatus').textContent='تمت استعادة مسودتك المحفوظة من هذا الجهاز.'}}).catch(()=>{});
    $('#refreshStore')?.addEventListener('click',loadStore);
    $('#storeSearchForm')?.addEventListener('submit',e=>{e.preventDefault();loadStore()});
    $('#createRepoForm')?.addEventListener('submit',createRepository);
    $('#repoFileForm')?.addEventListener('submit',saveRepositoryFile);
    $('#closeRepoWorkspace')?.addEventListener('click',()=>$('#repoWorkspace').classList.add('hidden'));
    $('#assistantForm')?.addEventListener('submit',sendAssistant);
    session().then(()=>{if($('#page-home').classList.contains('active'))loadPosts()}).catch(()=>{});
  }
  window.ESKOSections=Object.freeze({onNavigate,activate,loadPosts,loadStore,loadRepositories});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
