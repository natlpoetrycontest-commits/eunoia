const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const uid = () => Math.random().toString(36).slice(2);

const PROJECTS_KEY = 'eunoia_projects';
const PROJ_PREFIX = 'eunoia_proj_';

let currentProjectId = null;

/* ROUTING */
const routes = ['home','projects','editor','reverie','posts','melomanie'];
function showRoute(r){
  routes.forEach(v=>{
    const el = $('#view-'+v);
    if(el) el.classList.add('hidden');
  });
  $('#view-'+r)?.classList.remove('hidden');
}

document.addEventListener('click', e=>{
  const r = e.target.closest('[data-route]');
  if(!r) return;
  const route = r.dataset.route;

  if(route==='editor' && !currentProjectId){
    showRoute('projects');
    toast('Create or open a project first');
    return;
  }
  showRoute(route);
});

/* PROJECTS */
function loadProjects(){
  return JSON.parse(localStorage.getItem(PROJECTS_KEY)||'[]');
}
function saveProjects(p){
  localStorage.setItem(PROJECTS_KEY,JSON.stringify(p));
}
function loadProject(id){
  return JSON.parse(localStorage.getItem(PROJ_PREFIX+id)||'{}');
}
function saveProject(id,data){
  localStorage.setItem(PROJ_PREFIX+id,JSON.stringify(data));
}

function renderProjects(){
  const grid = $('#projectsGrid');
  grid.innerHTML='';
  loadProjects().forEach(p=>{
    const d=document.createElement('div');
    d.className='project-card';
    d.textContent=p.title;
    d.onclick=()=>openProject(p.id);
    grid.appendChild(d);
  });
}

$('#createProjectBtn').onclick=()=>{
  const title=$('#newProjectTitle').value||'Untitled';
  const id=uid();
  const projects=loadProjects();
  projects.unshift({id,title});
  saveProjects(projects);
  saveProject(id,{title,content:'<p></p>',characters:[]});
  openProject(id);
};

function openProject(id){
  currentProjectId=id;
  const data=loadProject(id);
  $('#projectTitleInput').value=data.title;
  $('#docCanvas').innerHTML=data.content;
  showRoute('editor');
}

/* AUTOSAVE */
$('#docCanvas').addEventListener('input',()=>{
  if(!currentProjectId) return;
  const data=loadProject(currentProjectId);
  data.content=$('#docCanvas').innerHTML;
  data.title=$('#projectTitleInput').value;
  saveProject(currentProjectId,data);
});

/* REVERIE */
$('#revCharBtn').onclick=()=>{
  $('#reverie-characters').classList.remove('hidden');
  $('#reverie-plots').classList.add('hidden');
};
$('#revPlotBtn').onclick=()=>{
  $('#reverie-plots').classList.remove('hidden');
  $('#reverie-characters').classList.add('hidden');
};

/* TOAST */
function toast(msg){
  const t=$('#toast');
  t.textContent=msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),1200);
}

window.onload=()=>{
  renderProjects();
  showRoute('home');
};
