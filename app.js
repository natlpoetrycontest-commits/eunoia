// eunoia SPA app.js
// Projects + editor + toolbar + spotify + export
// Save files: index.html, styles.css, app.js in same folder.

// ---------- Utilities ----------
function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function uid(){ return 'p_' + Math.random().toString(36).slice(2,10); }
function nowStr(){ return new Date().toLocaleString(); }
function toast(msg){ const t=qs('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1400); }

// ---------- Routing (simple) ----------
const routes = ['home','projects','editor','posts','melomanie'];
function showRoute(name){
  routes.forEach(r=> qs('#view-'+r).classList.add('hidden'));
  qs('#view-'+name).classList.remove('hidden');
  qsa('.tabbtn').forEach(b=> b.classList.toggle('active', b.dataset.route===name));
  // keep spotify iframe loaded (stays in DOM) so music continues
}
qsa('.tabbtn').forEach(btn=> btn.addEventListener('click', e=> showRoute(btn.dataset.route)));
qsa('[data-route]').forEach(el=> el.addEventListener('click', e=> showRoute(el.dataset.route)));

// ---------- Project storage ----------
const PROJECTS_KEY = 'eunoia_projects_v1';
function loadProjects(){
  const raw = localStorage.getItem(PROJECTS_KEY);
  try{ return raw ? JSON.parse(raw) : []; } catch(e){ return []; }
}
function saveProjects(list){ localStorage.setItem(PROJECTS_KEY, JSON.stringify(list)); }
function getProjectKey(id){ return 'eunoia_proj_' + id; }

// ---------- Render project cards ----------
function renderProjectsGrid(){
  const grid = qs('#projectsGrid'); grid.innerHTML='';
  const projects = loadProjects();
  if(projects.length===0){
    grid.innerHTML = '<p style="color:#fff">No projects yet — create one above.</p>';
    return;
  }
  projects.forEach(p=>{
    const card = document.createElement('div'); card.className='project-card';
    card.innerHTML = `<h4>${escapeHtml(p.title)}</h4><p>Updated: ${p.updated}</p>`;
    card.addEventListener('click', ()=> openProject(p.id));
    grid.appendChild(card);
  });
  renderMiniProjects();
}
function renderMiniProjects(){
  const mini = qs('#miniProjects'); mini.innerHTML = '';
  loadProjects().forEach(p=>{
    const el = document.createElement('div'); el.className='project-card-mini';
    el.style.marginBottom='8px';
    el.innerHTML = `<strong style="color:#111">${escapeHtml(p.title)}</strong><div style="font-size:12px;color:#333">${p.updated}</div>`;
    el.addEventListener('click', ()=> openProject(p.id));
    mini.appendChild(el);
  });
}

// ---------- Create project ----------
qs('#createProjectBtn').addEventListener('click', ()=>{
  const title = qs('#newProjectTitle').value.trim() || 'Untitled';
  const id = uid();
  const projects = loadProjects();
  const obj = {id, title, updated: nowStr()};
  projects.unshift(obj);
  saveProjects(projects);
  localStorage.setItem(getProjectKey(id), JSON.stringify({title, content:'<p></p>'}));
  qs('#newProjectTitle').value='';
  renderProjectsGrid();
  toast('Project created');
  openProject(id);
});

// ---------- Open project (load into editor) ----------
let currentProjectId = null;
function openProject(id){
  const raw = localStorage.getItem(getProjectKey(id));
  let data = {title:'Untitled', content:'<p></p>'};
  if(raw) try{ data = JSON.parse(raw); }catch(e){}
  currentProjectId = id;
  qs('#projectTitleInput').value = data.title || 'Untitled';
  qs('#editorRoot').innerHTML = data.content || '<p></p>';
  qs('#projectUpdated').textContent = 'Last saved: ' + (loadProjects().find(p=>p.id===id)?.updated || '—');
  showRoute('editor');
  highlightMiniCurrent();
}

// mini panel highlight
function highlightMiniCurrent(){
  qsa('#miniProjects .project-card-mini').forEach(el=> el.style.opacity=1);
}

// ---------- Rename / delete ----------
qs('#renameProjectBtn').addEventListener('click', ()=>{
  if(!currentProjectId) return toast('Open a project first');
  const newTitle = qs('#projectTitleInput').value.trim() || 'Untitled';
  const projects = loadProjects().map(p=> p.id===currentProjectId ? {...p, title:newTitle, updated: nowStr()} : p);
  saveProjects(projects);
  // update stored content title too
  const raw = localStorage.getItem(getProjectKey(currentProjectId));
  if(raw) { const d = JSON.parse(raw); d.title=newTitle; localStorage.setItem(getProjectKey(currentProjectId), JSON.stringify(d)); }
  renderProjectsGrid();
  toast('Renamed');
  qs('#projectUpdated').textContent = 'Last saved: ' + nowStr();
});

qs('#deleteProjectBtn').addEventListener('click', ()=>{
  if(!currentProjectId) return;
  if(!confirm('Delete this project? This cannot be undone.')) return;
  let projects = loadProjects().filter(p=> p.id!==currentProjectId);
  saveProjects(projects);
  localStorage.removeItem(getProjectKey(currentProjectId));
  currentProjectId = null;
  renderProjectsGrid();
  showRoute('projects');
  toast('Deleted');
});

// ---------- Tiny helper escape ----------
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }

// ---------- Editor toolbar actions (uses document.execCommand for simplicity) ----------
function exec(cmd, val=null){
  document.execCommand(cmd, false, val);
  saveNow(true);
}

qsa('.tool').forEach(btn => {
  btn.addEventListener('click', ()=> {
    const cmd = btn.dataset.cmd;
    if(cmd==='insertHr'){ exec('insertHorizontalRule'); }
    else if(cmd==='insertImage'){ const url = prompt('Image URL:'); if(url) exec('insertImage', url); }
    else exec(cmd);
  });
});

qs('#fontSize').addEventListener('change', (e)=>{
  const v = e.target.value;
  if(!v) return;
  exec('fontSize', 7); // set a temp size
  // adjust actual font size by finding the font element
  const el = document.getSelection().anchorNode.parentElement;
  if(el) el.style.fontSize = v;
  e.target.value = '';
});
qs('#heading').addEventListener('change', (e)=>{
  const v = e.target.value;
  if(!v) return exec('formatBlock', v);
  exec('formatBlock', 'p');
});
qs('#align').addEventListener('change', (e)=> {
  const v = e.target.value;
  if(!v) return;
  exec('justify' + (v==='left'?'Left': v==='right'?'Right': v==='center'?'Center':'Full'));
  e.target.value = '';
});
qs('#fontColor').addEventListener('change', e=> exec('foreColor', e.target.value));
qs('#highlightColor').addEventListener('change', e=> exec('hiliteColor', e.target.value));

// undo/redo handled by exec commands above via data-cmd

// ensure Enter creates paragraphs (browser default usually does this in contenteditable)
// to ensure Tab creates real indent (tab -> 2 em)
qs('#editorRoot').addEventListener('keydown', (e)=>{
  if(e.key === 'Tab'){ e.preventDefault();
    // insert two non-breaking spaces
    document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
  }
});

// ---------- Autosave per project ----------
let saveTimer;
function saveNow(silent=false){
  if(!currentProjectId) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{
    const projects = loadProjects().map(p=> p.id===currentProjectId ? {...p, title: qs('#projectTitleInput').value || p.title, updated: nowStr()} : p);
    saveProjects(projects);
    // save project content
    const data = { title: qs('#projectTitleInput').value || 'Untitled', content: qs('#editorRoot').innerHTML };
    localStorage.setItem(getProjectKey(currentProjectId), JSON.stringify(data));
    qs('#saveIndicator').textContent = 'saved';
    if(!silent) toast('Saved');
    qs('#projectUpdated').textContent = 'Last saved: ' + nowStr();
  }, 350);
}
// call save on input
['input','keyup','paste','blur'].forEach(evt=> qs('#editorRoot').addEventListener(evt, ()=> saveNow(true)));
qs('#projectTitleInput').addEventListener('input', ()=> saveNow(true));

// also autosave every 6s for safety
setInterval(()=> saveNow(true), 6000);

// ---------- Download .docx (html-docx-js) ----------
qs('#downloadDocxBtn').addEventListener('click', ()=>{
  if(!currentProjectId){ toast('Open a project first'); return; }
  const title = (qs('#projectTitleInput').value || 'manuscript').replace(/[\\/:*?"<>|]/g,'').trim();
  const html = `<html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:Georgia,serif;padding:40px;color:#111} h1{font-size:22px}</style>
    </head><body>${ qs('#editorRoot').innerHTML }</body></html>`;
  try{
    const converted = window.htmlDocx.asBlob(html);
    const a = document.createElement('a'); a.href = URL.createObjectURL(converted); a.download = title + '.docx'; a.click();
    URL.revokeObjectURL(a.href);
  }catch(e){ alert('Export error: ' + (e.message||e)); }
});

// ---------- Download PDF (jsPDF) ----------
qs('#downloadPdfBtn').addEventListener('click', async ()=>{
  if(!currentProjectId){ toast('Open a project first'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'a4' });
  const container = document.createElement('div');
  container.style.width = '800px';
  container.innerHTML = qs('#editorRoot').innerHTML;
  document.body.appendChild(container);
  await doc.html(container, { x:40, y:40, html2canvas: { scale: 1.2 } });
  doc.save((qs('#projectTitleInput').value||'manuscript') + '.pdf');
  document.body.removeChild(container);
});

// ---------- Projects load on start ----------
window.addEventListener('load', ()=>{
  renderProjectsGrid();
  // route to home by default
  showRoute('home');
  // load spotify if stored
  const sp = localStorage.getItem('eunoia_spotify');
  if(sp) { qs('#spotifyPlayer').src = sp; qs('#spotifyFloat').src = sp; }
});

// ---------- Back to projects -->
qs('#backToProjects').addEventListener('click', ()=> showRoute('projects'));

// open project id helper (find first project id if none provided)
function openFirstProject(){
  const p = loadProjects()[0];
  if(p) openProject(p.id);
  else toast('No projects exist. Create one.');
}

// ---------- quick open by doubleclick on projects grid (already handled) ----------

// ---------- create project by pressing Enter in input -----------
qs('#newProjectTitle').addEventListener('keypress', (e)=> {
  if(e.key==='Enter'){ qs('#createProjectBtn').click(); }
});

// ---------- Load Spotify ----------
qs('#loadSpotify').addEventListener('click', ()=>{
  const url = qs('#spotifyUrl').value.trim();
  if(!url) return toast('Paste a Spotify embed URL or playlist link');
  // transform to embed if it's a regular open.spotify link
  let embed = url;
  if(url.includes('open.spotify.com') && !url.includes('embed')) {
    embed = url.replace('open.spotify.com', 'open.spotify.com/embed');
  }
  qs('#spotifyPlayer').src = embed;
  qs('#spotifyFloat').src = embed;
  localStorage.setItem('eunoia_spotify', embed);
  toast('Spotify loaded — tap play in the player to start audio');
});

// floating player open/close
qs('#openSmallPlayer').addEventListener('click', ()=> qs('#floatingPlayer').classList.remove('hidden'));
qs('#closeFloat').addEventListener('click', ()=> qs('#floatingPlayer').classList.add('hidden'));

// ---------- helper: click project from list (on projects page) ----------
qs('#projectsGrid').addEventListener('dblclick', e=> {
  // optional: open first
});

// ---------- Make sure editor retains paragraphs when pasting plain text ----------
qs('#editorRoot').addEventListener('paste', function(e){
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text');
  // preserve line breaks -> paragraphs
  const html = text.split(/\r?\n/).map(s => '<p>'+escapeHtml(s)+'</p>').join('');
  document.execCommand('insertHTML', false, html);
});
