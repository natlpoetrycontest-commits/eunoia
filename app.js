// eunoia full SPA app.js (fixed)
// Matches the index.html you pasted and fixes "can't open projects" issue
// Features: SPA routing, projects, google-docs-style editor, TOC, sticky notes, reverie (characters+plots per project), spotify, exports, autosave

/* ----------------------
   Small helpers
-----------------------*/
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const uid = () => 'id_' + Math.random().toString(36).slice(2,9);
const toast = (m) => { const t = $('#toast'); if(!t) return; t.textContent = m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1400); };

/* ----------------------
   Storage keys
-----------------------*/
const PROJECTS_KEY = 'eunoia_projects_v5';
const PROJ_PREFIX = 'eunoia_proj_v5_';

/* ----------------------
   Low-level storage helpers
-----------------------*/
function loadProjects(){ try{ return JSON.parse(localStorage.getItem(PROJECTS_KEY)) || []; }catch(e){ return []; } }
function saveProjects(list){ localStorage.setItem(PROJECTS_KEY, JSON.stringify(list)); }
function saveProjectContent(id, data){ localStorage.setItem(PROJ_PREFIX + id, JSON.stringify(data)); }
function loadProjectContent(id){ try{ return JSON.parse(localStorage.getItem(PROJ_PREFIX + id)) || null; }catch(e){ return null; } }

/* ----------------------
   Utility
-----------------------*/
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }

/* ----------------------
   Routing
-----------------------*/
const routes = ['home','projects','editor','reverie','posts','melomanie'];
function showRoute(name){
  routes.forEach(r=> { const el = $('#view-'+r); if(el) el.classList.add('hidden'); });
  const target = $('#view-'+name);
  if(target) target.classList.remove('hidden');
  $$('.tabbtn').forEach(b => b.classList.toggle('active', b.dataset.route===name));
}

/* Use delegation for any element using data-route anywhere */
window.addEventListener('click', (e)=> {
  const route = e.target.closest('[data-route]');
  if(route) { showRoute(route.dataset.route); return; }
});

/* ----------------------
   Projects rendering & open
-----------------------*/
function renderProjectsGrid(){
  const grid = $('#projectsGrid'); if(!grid) return;
  grid.innerHTML = '';
  const projects = loadProjects();
  if(projects.length===0){
    grid.innerHTML = '<p style="color:#fff">No projects yet — create one above.</p>';
    renderMiniProjects();
    return;
  }
  projects.forEach(p=>{
    // project card with data-id for delegation
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.projectId = p.id;
    card.innerHTML = `<h4>${escapeHtml(p.title)}</h4><p>Updated: ${p.updated}</p>`;
    grid.appendChild(card);
  });
  renderMiniProjects();
}

function renderMiniProjects(){
  const mini = $('#miniProjects'); if(!mini) return; mini.innerHTML='';
  loadProjects().forEach(p=>{
    const el = document.createElement('div'); el.className='project-card-mini';
    el.dataset.projectId = p.id;
    el.style.background='#fff'; el.style.padding='8px'; el.style.borderRadius='8px'; el.style.marginBottom='8px';
    el.innerHTML = `<strong style="color:#111">${escapeHtml(p.title)}</strong><div style="font-size:12px;color:#333">${p.updated}</div>`;
    mini.appendChild(el);
  });
}

/* Delegated click handler for project cards (works for dynamic cards) */
document.addEventListener('click', (e) => {
  const projectCard = e.target.closest('.project-card, .project-card-mini');
  if(projectCard && projectCard.dataset.projectId){
    openProject(projectCard.dataset.projectId);
  }
});

/* ----------------------
   Create project
-----------------------*/
$('#createProjectBtn')?.addEventListener('click', ()=>{
  const title = ($('#newProjectTitle')?.value || '').trim() || 'Untitled';
  const id = uid();
  const projects = loadProjects();
  projects.unshift({id, title, updated: new Date().toLocaleString()});
  saveProjects(projects);

  // initial project payload
  const payload = { title, content: '<h1>Start</h1><p></p>', notes: [], characters: [], plots: [] };
  saveProjectContent(id, payload);

  $('#newProjectTitle').value = '';
  renderProjectsGrid();
  openProject(id);
  toast('Project created');
});

/* ----------------------
   Current project handling
-----------------------*/
let currentProjectId = null;

function openProject(id){
  // find project meta
  const projects = loadProjects();
  const meta = projects.find(p => p.id === id);
  if(!meta){
    toast('Project not found');
    return;
  }

  // load stored content
  const data = loadProjectContent(id) || { title: meta.title || 'Untitled', content: '<h1>Start</h1><p></p>', notes: [], characters: [], plots: [] };

  currentProjectId = id;
  $('#projectTitleInput').value = data.title || meta.title || 'Untitled';
  $('#docCanvas').innerHTML = data.content || '<p></p>';

  // render project-scoped stuff
  renderNotesList();
  renderCharactersGrid();
  renderPlotsGrid();
  updateProjectUpdated();

  generateTOC();
  showRoute('editor');

  // small focus to make typing possible instantly
  setTimeout(()=> {
    const dc = $('#docCanvas');
    if(dc) { dc.focus(); placeCaretAtEnd(dc); }
  }, 150);
}

/* helper to place caret at end of contenteditable */
function placeCaretAtEnd(el) {
  try{
    el = el instanceof HTMLElement ? el : document.getElementById(el);
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }catch(e){}
}

$('#backToProjects')?.addEventListener('click', ()=> {
  // clear currentProjectId so editor doesn't autosave to wrong project
  currentProjectId = null;
  showRoute('projects');
});

/* ----------------------
   Delete project
   (optional button support if you add one later)
-----------------------*/
$('#deleteProjectBtn')?.addEventListener('click', ()=> {
  if(!currentProjectId) return toast('Open a project first');
  if(!confirm('Delete this project? This cannot be undone.')) return;
  let projects = loadProjects().filter(p=> p.id!==currentProjectId);
  saveProjects(projects);
  localStorage.removeItem(PROJ_PREFIX + currentProjectId);
  currentProjectId = null;
  renderProjectsGrid();
  showRoute('projects');
  toast('Deleted');
});

/* ----------------------
   Autosave logic
-----------------------*/
let saveTimer;
function saveNow(silent=false){
  if(!currentProjectId) return;
  clearTimeout(saveTimer);
  $('#saveIndicator').textContent = 'saving...';
  saveTimer = setTimeout(()=>{
    // update project meta timestamp
    const projects = loadProjects().map(p=> p.id===currentProjectId ? {...p, title: $('#projectTitleInput').value || p.title, updated: new Date().toLocaleString()} : p);
    saveProjects(projects);

    // save project payload
    const existing = loadProjectContent(currentProjectId) || { title: $('#projectTitleInput').value || 'Untitled', content:'', notes:[], characters:[], plots:[] };
    existing.title = $('#projectTitleInput').value || existing.title;
    existing.content = $('#docCanvas').innerHTML;
    saveProjectContent(currentProjectId, existing);

    $('#saveIndicator').textContent = 'saved';
    if(!silent) toast('Saved');
    $('#projectUpdated').textContent = 'Last saved: ' + new Date().toLocaleString();
    generateTOC();
  }, 500);
}

/* Attach save triggers AFTER docCanvas exists */
(function attachDocListeners(){
  const doc = $('#docCanvas');
  if(doc){
    ['input','keyup','paste','blur'].forEach(evt => doc.addEventListener(evt, ()=> saveNow(true)));
  } else {
    // if docCanvas not yet present, try again shortly (safe guard)
    window.addEventListener('load', ()=> {
      const d2 = $('#docCanvas');
      if(d2) ['input','keyup','paste','blur'].forEach(evt => d2.addEventListener(evt, ()=> saveNow(true)));
    });
  }
})();
setInterval(()=> saveNow(true), 6000);

/* ----------------------
   Editor toolbar
-----------------------*/
function exec(cmd, val=null){
  document.execCommand(cmd, false, val);
  saveNow(true);
}
$$('.tool').forEach(btn => {
  btn.addEventListener('click', ()=> {
    const cmd = btn.dataset.cmd;
    if(cmd==='insertHr') exec('insertHorizontalRule');
    else if(cmd==='insertImage'){ const url=prompt('Image URL'); if(url) exec('insertImage', url); }
    else if(cmd) exec(cmd);
  });
});
$('#fontSize')?.addEventListener('change', (e)=>{
  const v = e.target.value; if(!v) return;
  exec('fontSize', 7);
  const el = window.getSelection().anchorNode ? window.getSelection().anchorNode.parentElement : null;
  if(el) el.style.fontSize = v;
  e.target.value = '';
});
$('#heading')?.addEventListener('change', (e)=>{
  const v = e.target.value; if(!v) return exec('formatBlock', v);
  exec('formatBlock', 'p');
});
$('#align')?.addEventListener('change', (e)=> {
  const v = e.target.value;
  if(!v) return;
  exec(v === 'justify' ? 'justifyFull' : 'justify' + (v==='left'?'Left':v==='center'?'Center':'Right'));
  e.target.value = '';
});
$('#fontColor')?.addEventListener('change', e=> exec('foreColor', e.target.value));
$('#highlightColor')?.addEventListener('change', e=> exec('hiliteColor', e.target.value));
$('#fontSelect')?.addEventListener('change', e=>{
  const f = e.target.value;
  exec('fontName', f);
});

/* Tab inserts spaces inside editor */
$('#docCanvas')?.addEventListener('keydown', (e)=>{
  if(e.key === 'Tab'){ e.preventDefault(); document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;'); }
});

/* ----------------------
   TOC generation
-----------------------*/
function generateTOC(){
  const toc = $('#tocList'); if(!toc) return;
  toc.innerHTML = '';
  const dc = $('#docCanvas');
  if(!dc) return;
  const headings = dc.querySelectorAll('h1,h2,h3');
  headings.forEach((h, i)=>{
    const id = h.id || ('h_' + i + '_' + (Math.random().toString(36).slice(2,6)));
    h.id = id;
    const btn = document.createElement('button');
    btn.textContent = (h.tagName + ' — ' + h.textContent.slice(0,60));
    btn.addEventListener('click', ()=> { document.getElementById(id).scrollIntoView({behavior:'smooth', block:'center'}); });
    btn.style.padding='6px'; btn.style.marginBottom='6px'; btn.style.background='transparent'; btn.style.border='none'; btn.style.color='#fff';
    toc.appendChild(btn);
  });
}
$('#docCanvas')?.addEventListener('input', ()=> generateTOC());

/* ----------------------
   Notes system (attach to paragraph/heading)
-----------------------*/
function getProjectData(){ if(!currentProjectId) return null; return loadProjectContent(currentProjectId) || {title:'Untitled', content:'', notes:[], characters:[], plots:[]}; }

$('#addNoteBtn')?.addEventListener('click', ()=>{
  if(!currentProjectId) return toast('Open a project first');
  const sel = window.getSelection();
  const node = sel.anchorNode ? sel.anchorNode.parentElement : null;
  const para = node ? node.closest('p, h1, h2, h3, li') : null;
  if(!para){ toast('Click a paragraph (or heading) first to attach a note'); return; }
  const textRef = para.innerText.slice(0,60);
  const noteText = prompt('Note for this paragraph (will not appear in exports):');
  if(!noteText) return;
  const data = getProjectData();
  const note = { id: uid(), refText: textRef, paraIndex: Array.from($('#docCanvas').children).indexOf(para), content: noteText, created: new Date().toLocaleString() };
  data.notes = data.notes || [];
  data.notes.push(note);
  saveProjectContent(currentProjectId, data);
  renderNotesList();
  toast('Note saved');
});

function renderNotesList(){
  const notesDiv = $('#notesList'); if(!notesDiv) return; notesDiv.innerHTML = '';
  const data = getProjectData(); if(!data) return;
  (data.notes || []).forEach(n=>{
    const pill = document.createElement('div'); pill.className='note-pill';
    pill.innerHTML = `<strong>${escapeHtml(n.refText)}</strong><small>${escapeHtml(n.content)}</small>`;
    notesDiv.appendChild(pill);
  });
}

/* ----------------------
   Reverie switching + functions
-----------------------*/
const revCharBtn = document.getElementById('revCharBtn');
const revPlotBtn = document.getElementById('revPlotBtn');
const revCharsSection = document.getElementById('reverie-characters');
const revPlotsSection = document.getElementById('reverie-plots');

if(revCharBtn && revPlotBtn && revCharsSection && revPlotsSection){
  function showCharacters(){ revCharsSection.classList.remove('hidden'); revPlotsSection.classList.add('hidden'); }
  function showPlots(){ revPlotsSection.classList.remove('hidden'); revCharsSection.classList.add('hidden'); }
  revCharBtn.addEventListener('click', showCharacters);
  revPlotBtn.addEventListener('click', showPlots);
}

// Characters & Plots per project helpers
function getCharacters(){ const data = getProjectData(); return data ? (data.characters || []) : []; }
function getPlots(){ const data = getProjectData(); return data ? (data.plots || []) : []; }

function renderCharactersGrid(){
  const grid = $('#charactersGrid'); if(!grid) return; grid.innerHTML='';
  const chars = getCharacters();
  if(chars.length===0){ grid.innerHTML = '<p>No characters yet for this project.</p>'; return; }
  chars.forEach(c=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<h4>${escapeHtml(c.name)}</h4><p><small>Role: ${escapeHtml(c.role||'')}</small></p><button data-id="${c.id}" class="editCharBtn">Edit</button>`;
    grid.appendChild(card);
  });
  $$('.editCharBtn').forEach(b => b.addEventListener('click', ()=> editCharacter(b.dataset.id)));
}

function renderPlotsGrid(){
  const grid = $('#plotsGrid'); if(!grid) return; grid.innerHTML='';
  const plots = getPlots();
  if(plots.length===0){ grid.innerHTML='<p>No plots yet.</p>'; return; }
  plots.forEach(p=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<h4>${escapeHtml(p.title)}</h4><p><small>Last edit: ${p.updated||'-'}</small></p><button data-id="${p.id}" class="editPlotBtn">Edit</button>`;
    grid.appendChild(card);
  });
  $$('.editPlotBtn').forEach(b => b.addEventListener('click', ()=> editPlot(b.dataset.id)));
}

/* Create character */
$('#createCharacterBtn')?.addEventListener('click', ()=>{
  if(!currentProjectId) return toast('Open a project first');
  const name = ($('#newCharacterName')?.value || '').trim() || 'Unnamed';
  const data = getProjectData();
  data.characters = data.characters || [];
  const c = { id: uid(), name, physical:'', general:'', internal:'', misbelief:'', desire:'', fear:'', quirks:'', hobbies:'', role:'', song:'', quote:'', created: new Date().toLocaleString() };
  data.characters.push(c);
  saveProjectContent(currentProjectId, data);
  $('#newCharacterName').value='';
  renderCharactersGrid();
  editCharacter(c.id);
});

/* Edit character */
function editCharacter(id){
  const data = getProjectData(); if(!data) return;
  const c = (data.characters||[]).find(x=> x.id===id); if(!c) return;
  $('#characterEditor').classList.remove('hidden');
  $('#charEditorTitle').textContent = 'Edit ' + c.name;
  $('#charName').value = c.name; $('#charSong').value = c.song || '';
  $('#charPhysical').value = c.physical || ''; $('#charGeneral').value = c.general || '';
  $('#charInternal').value = c.internal || ''; $('#charMisbelief').value = c.misbelief || '';
  $('#charDesire').value = c.desire || ''; $('#charFear').value = c.fear || '';
  $('#charQuirks').value = c.quirks || ''; $('#charHobbies').value = c.hobbies || '';
  $('#charRole').value = c.role || ''; $('#charQuote').value = c.quote || '';

  $('#saveCharacterBtn').onclick = ()=> {
    c.name = $('#charName').value.trim() || c.name; c.song = $('#charSong').value;
    c.physical = $('#charPhysical').value; c.general = $('#charGeneral').value; c.internal = $('#charInternal').value;
    c.misbelief = $('#charMisbelief').value; c.desire = $('#charDesire').value; c.fear = $('#charFear').value;
    c.quirks = $('#charQuirks').value; c.hobbies = $('#charHobbies').value; c.role = $('#charRole').value; c.quote = $('#charQuote').value;
    saveProjectContent(currentProjectId, data);
    $('#characterEditor').classList.add('hidden');
    renderCharactersGrid();
    toast('Character saved');
  };
  $('#cancelCharacterBtn').onclick = ()=> $('#characterEditor').classList.add('hidden');
}

/* Create plot */
$('#createPlotBtn')?.addEventListener('click', ()=>{
  if(!currentProjectId) return toast('Open a project first');
  const title = ($('#newPlotTitle')?.value || '').trim() || 'Untitled Plot';
  const data = getProjectData(); data.plots = data.plots || [];
  const p = { id: uid(), title, exposition:'', inciting:'', point1:'', rising:'', midpoint:'', point2:'', climax:'', denouement:'', updated: new Date().toLocaleString() };
  data.plots.push(p);
  saveProjectContent(currentProjectId, data);
  $('#newPlotTitle').value='';
  renderPlotsGrid();
  editPlot(p.id);
});

/* Edit plot */
function editPlot(id){
  const data = getProjectData(); if(!data) return;
  const p = (data.plots||[]).find(x=> x.id===id); if(!p) return;
  $('#plotEditor').classList.remove('hidden');
  $('#plotEditorTitle').textContent = 'Edit ' + p.title;
  $('#plotTitle').value = p.title || '';
  $('#plotExposition').value = p.exposition || ''; $('#plotInciting').value = p.inciting || ''; $('#plotPoint1').value = p.point1 || '';
  $('#plotRising').value = p.rising || ''; $('#plotMidpoint').value = p.midpoint || ''; $('#plotPoint2').value = p.point2 || '';
  $('#plotClimax').value = p.climax || ''; $('#plotDenouement').value = p.denouement || '';

  $('#savePlotBtn').onclick = ()=>{
    p.title = $('#plotTitle').value || p.title;
    p.exposition = $('#plotExposition').value; p.inciting = $('#plotInciting').value; p.point1 = $('#plotPoint1').value;
    p.rising = $('#plotRising').value; p.midpoint = $('#plotMidpoint').value; p.point2 = $('#plotPoint2').value;
    p.climax = $('#plotClimax').value; p.denouement = $('#plotDenouement').value; p.updated = new Date().toLocaleString();
    saveProjectContent(currentProjectId, data);
    $('#plotEditor').classList.add('hidden');
    renderPlotsGrid();
    toast('Plot saved');
  };
  $('#cancelPlotBtn').onclick = ()=> $('#plotEditor').classList.add('hidden');
}

/* ----------------------
   Spotify
-----------------------*/
$('#loadSpotify')?.addEventListener('click', ()=> {
  const url = ($('#spotifyUrl')?.value || '').trim();
  if(!url) return toast('Paste a spotify link');
  let embed = url;
  if(url.includes('open.spotify.com') && !url.includes('/embed/')) embed = url.replace('open.spotify.com', 'open.spotify.com/embed');
  $('#spotifyPlayer').src = embed;
  localStorage.setItem('eunoia_spotify', embed);
  toast('Spotify loaded — press play to allow audio');
});
window.addEventListener('load', ()=> {
  const sp = localStorage.getItem('eunoia_spotify'); if(sp) $('#spotifyPlayer').src = sp;
});

/* ----------------------
   Exports (docx/pdf)
-----------------------*/
$('#downloadDocxBtn')?.addEventListener('click', ()=> {
  if(!currentProjectId) { toast('Open a project first'); return; }
  const title = ($('#projectTitleInput')?.value || 'manuscript').replace(/[\\/:*?"<>|]/g,'').trim();
  const contentHtml = $('#docCanvas')?.innerHTML || '';
  const html = `<html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Georgia,serif;padding:40px;color:#111}</style></head><body>${contentHtml}</body></html>`;
  try{
    const converted = window.htmlDocx.asBlob(html);
    const a = document.createElement('a'); a.href = URL.createObjectURL(converted); a.download = title + '.docx'; a.click(); URL.revokeObjectURL(a.href);
  } catch(e){ alert('Export error: ' + (e.message||e)); }
});
$('#downloadPdfBtn')?.addEventListener('click', async ()=> {
  if(!currentProjectId) { toast('Open a project first'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'a4' });
  const tmp = document.createElement('div'); tmp.style.width='800px'; tmp.innerHTML = $('#docCanvas').innerHTML; document.body.appendChild(tmp);
  await doc.html(tmp, { x:40, y:40, html2canvas: { scale:1.2 } });
  doc.save( ($('#projectTitleInput')?.value||'manuscript') + '.pdf' );
  document.body.removeChild(tmp);
});

/* ----------------------
   Startup
-----------------------*/
window.addEventListener('load', ()=> {
  renderProjectsGrid();
  showRoute('home');
});
