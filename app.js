/******************************
  BASIC HELPERS
*******************************/
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/******************************
  SPA NAVIGATION
*******************************/
const pages = $$('.page');
const navLinks = $$('.nav-link');

function showPage(id) {
  pages.forEach((p) => p.classList.add('hidden'));
  $('#' + id).classList.remove('hidden');

  navLinks.forEach((n) => n.classList.remove('active-nav'));
  $(`[data-page="${id}"]`)?.classList.add('active-nav');
}

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    const page = link.getAttribute('data-page');
    showPage(page);
  });
});

showPage('home'); // default

/******************************
  LOGASTELLUS — PROJECT SYSTEM
*******************************/
const projectListEl = $('#project-list');
const newProjectBtn = $('#new-project');
const editorPage = $('#logastellus-editor');
const editorArea = $('#editor-area');
const toolbarBtns = $$('.tool-btn');

let currentProject = null;

// load existing projects
function loadProjects() {
  projectListEl.innerHTML = '';
  const projects = JSON.parse(localStorage.getItem('projects') || '{}');

  Object.keys(projects).forEach((id) => {
    const div = document.createElement('div');
    div.className = 'project-card';
    div.textContent = projects[id].name || 'Untitled Project';

    div.addEventListener('click', () => openProject(id));
    projectListEl.appendChild(div);
  });
}

function createProject() {
  const id = 'proj-' + Date.now();
  const projects = JSON.parse(localStorage.getItem('projects') || '{}');

  projects[id] = {
    name: 'New Project',
    content: '',
    characters: {},     // reverie data
    plots: {}           // reverie data
  };

  localStorage.setItem('projects', JSON.stringify(projects));
  loadProjects();
}

newProjectBtn.addEventListener('click', createProject);

function openProject(id) {
  currentProject = id;
  showPage('logastellus-editor');

  const projects = JSON.parse(localStorage.getItem('projects') || '{}');
  editorArea.innerHTML = projects[id].content || '';
}

/******************************
  EDITOR AUTOSAVE + TOOLBAR
*******************************/
function saveEditor() {
  if (!currentProject) return;

  const projects = JSON.parse(localStorage.getItem('projects') || '{}');
  projects[currentProject].content = editorArea.innerHTML;
  localStorage.setItem('projects', JSON.stringify(projects));
}

editorArea.addEventListener('input', saveEditor);

// basic toolbar commands
toolbarBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const cmd = btn.getAttribute('data-cmd');

    if (cmd === 'h1') {
      document.execCommand('formatBlock', false, '<h1>');
    } else if (cmd === 'h2') {
      document.execCommand('formatBlock', false, '<h2>');
    } else {
      document.execCommand(cmd, false, null);
    }

    saveEditor();
  });
});

/******************************
  STELLAVIVA — BLOG SUBMISSION
*******************************/
const postInput = $('#post-input');
const postBtn = $('#post-btn');
const postsContainer = $('#posts');

function loadPosts() {
  postsContainer.innerHTML = '';
  const posts = JSON.parse(localStorage.getItem('stellaviva') || '[]');

  posts.forEach((p) => {
    const div = document.createElement('div');
    div.className = 'post-item';
    div.textContent = p;
    postsContainer.appendChild(div);
  });
}
loadPosts();

postBtn.addEventListener('click', () => {
  const txt = postInput.value.trim();
  if (!txt) return;

  const posts = JSON.parse(localStorage.getItem('stellaviva') || '[]');
  posts.push(txt);
  localStorage.setItem('stellaviva', JSON.stringify(posts));

  postInput.value = '';
  loadPosts();
});

/******************************
  MELOMANIE — SPOTIFY EMBED
*******************************/
const spotifyPlayBtn = $('#spotify-play');
spotifyPlayBtn?.addEventListener('click', () => {
  const frame = $('#spotify-frame');
  frame.src = frame.src; // reload to play
});

/******************************
  REVERIE — CHARACTERS + PLOTS
*******************************/
const reverieHome = $('#reverie-home');
const reverieCharacters = $('#reverie-characters');
const reveriePlots = $('#reverie-plots');

const charBtn = $('#rev-characters-btn');
const plotBtn = $('#rev-plots-btn');

// show correct reverie section
function showReverie(section) {
  reverieHome.classList.add('hidden');
  reverieCharacters.classList.add('hidden');
  reveriePlots.classList.add('hidden');

  if (section === 'home') reverieHome.classList.remove('hidden');
  if (section === 'characters') reverieCharacters.classList.remove('hidden');
  if (section === 'plots') reveriePlots.classList.remove('hidden');
}

charBtn?.addEventListener('click', () => showReverie('characters'));
plotBtn?.addEventListener('click', () => showReverie('plots'));

/******************************
  REVERIE — ADD CHARACTER
*******************************/
const charAddBtn = $('#add-character');
const charList = $('#character-list');

function loadCharacters() {
  if (!currentProject) return;
  const all = JSON.parse(localStorage.getItem('projects') || '{}');
  const chars = all[currentProject].characters || {};

  charList.innerHTML = '';

  Object.keys(chars).forEach((cid) => {
    const div = document.createElement('div');
    div.className = 'char-card';
    div.textContent = chars[cid].name || 'Unnamed Character';
    charList.appendChild(div);
  });
}

charAddBtn?.addEventListener('click', () => {
  if (!currentProject) return;

  const all = JSON.parse(localStorage.getItem('projects') || '{}');
  const chars = all[currentProject].characters || {};

  const id = 'char-' + Date.now();
  chars[id] = {
    name: 'New Character',
    desc: ''
  };

  all[currentProject].characters = chars;
  localStorage.setItem('projects', JSON.stringify(all));
  loadCharacters();
});

/******************************
  REVERIE — ADD PLOT
*******************************/
const plotAddBtn = $('#add-plot');
const plotList = $('#plot-list');

function loadPlots() {
  if (!currentProject) return;

  const all = JSON.parse(localStorage.getItem('projects') || '{}');
  const plots = all[currentProject].plots || {};
  plotList.innerHTML = '';

  Object.keys(plots).forEach((pid) => {
    const div = document.createElement('div');
    div.className = 'plot-card';
    div.textContent = plots[pid].name || 'Untitled Plot';
    plotList.appendChild(div);
  });
}

plotAddBtn?.addEventListener('click', () => {
  if (!currentProject) return;

  const all = JSON.parse(localStorage.getItem('projects') || '{}');
  const plots = all[currentProject].plots || {};

  const id = 'plot-' + Date.now();
  plots[id] = {
    name: 'New Plot',
    structure: {}
  };

  all[currentProject].plots = plots;
  localStorage.setItem('projects', JSON.stringify(all));
  loadPlots();
});

/******************************
  WHEN OPENING REVERIE PAGE
  LOAD CHARACTERS AND PLOTS
*******************************/
$('[data-page="reverie"]')?.addEventListener('click', () => {
  showReverie('home');
  loadCharacters();
  loadPlots();
});
