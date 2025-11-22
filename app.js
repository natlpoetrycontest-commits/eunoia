// --- GLOBAL STATE ---
let currentPage = "home";
let projects = JSON.parse(localStorage.getItem("projects") || "[]");
let currentProject = null;

// --- SAVE ---
function saveProjects() {
  localStorage.setItem("projects", JSON.stringify(projects));
}

// --- RENDER ROOT ---
function render() {
  const root = document.getElementById("root");
  root.innerHTML = "";

  renderNavbar(root);

  if (currentPage === "home") return renderHome(root);
  if (currentPage === "logastellus") return renderProjectList(root);
  if (currentPage === "editor") return renderEditor(root);
  if (currentPage === "stellaviva") return renderStellaviva(root);
  if (currentPage === "reverie") return renderReverieHome(root);
  if (currentPage === "characters") return renderCharacterList(root);
  if (currentPage === "plots") return renderPlotList(root);
  if (currentPage === "newCharacter") return renderCharacterTemplate(root);
  if (currentPage === "newPlot") return renderPlotTemplate(root);
}

// --- NAVBAR ---
function renderNavbar(root) {
  const nav = document.createElement("div");
  nav.className = "navbar";

  const pages = ["home", "logastellus", "stellaviva", "reverie"];

  pages.forEach(p => {
    const b = document.createElement("span");
    b.textContent = p;
    b.onclick = () => {
      currentPage = p;
      render();
    };
    nav.appendChild(b);
  });

  root.appendChild(nav);
}

// ================ HOME ==================
function renderHome(root) {
  const div = document.createElement("div");
  div.className = "page";

  div.innerHTML = `
    <div class="home-title">eunoia</div>
    <div class="home-buttons">
      <button onclick="openLogastellus()">logastellus</button>
      <button onclick="openStellaviva()">stellaviva</button>
      <button onclick="openReverie()">reverie</button>
    </div>
  `;

  root.appendChild(div);
}

function openLogastellus() {
  currentPage = "logastellus";
  render();
}

function openStellaviva() {
  currentPage = "stellaviva";
  render();
}

function openReverie() {
  currentPage = "reverie";
  render();
}

// =============== LOGASTELLUS PROJECT LIST =================

function renderProjectList(root) {
  const div = document.createElement("div");
  div.className = "page";

  div.innerHTML = `
    <h1>Your Projects</h1>
    <button onclick="newProject()">+ New Project</button>
  `;

  projects.forEach((p, index) => {
    const card = document.createElement("div");
    card.className = "project-card";
    card.textContent = p.name;
    card.onclick = () => {
      currentProject = index;
      currentPage = "editor";
      render();
    };
    div.appendChild(card);
  });

  root.appendChild(div);
}

function newProject() {
  const name = prompt("Project name:");
  if (!name) return;

  projects.push({
    name,
    text: "",
    notes: [],
    characters: [],
    plots: []
  });

  saveProjects();
  render();
}

// =============== EDITOR PAGE =================

function renderEditor(root) {
  const proj = projects[currentProject];

  const div = document.createElement("div");
  div.className = "page";

  div.innerHTML = `
    <h1>${proj.name}</h1>
    <div class="editor-container">

      <div id="editor" contenteditable="true">${proj.text}</div>

      <div class="sticky-notes">
        <button onclick="addNote()">+ Add Note</button>
        <div id="notesArea"></div>
      </div>

    </div>
  `;

  root.appendChild(div);

  // Load notes
  const notesArea = document.getElementById("notesArea");
  proj.notes.forEach(n => {
    const noteDiv = document.createElement("div");
    noteDiv.className = "note";
    noteDiv.textContent = n;
    notesArea.appendChild(noteDiv);
  });

  // Auto-save text
  const editor = document.getElementById("editor");
  editor.oninput = () => {
    proj.text = editor.innerHTML;
    saveProjects();
  };
}

function addNote() {
  const msg = prompt("Note:");
  if (!msg) return;

  projects[currentProject].notes.push(msg);
  saveProjects();
  render();
}

// =============== STELLAVIVA =================

function renderStellaviva(root) {
  const div = document.createElement("div");
  div.className = "page";
  div.innerHTML = `<h1>Welcome to stellaviva</h1>`;
  root.appendChild(div);
}

// =============== REVERIE HOME =================

function renderReverieHome(root) {
  const div = document.createElement("div");
  div.className = "page";

  div.innerHTML = `
    <h1>reverie</h1>
    <div class="reverie-grid">
      <div class="reverie-box" onclick="openCharacters()">Characters</div>
      <div class="reverie-box" onclick="openPlots()">Plots</div>
    </div>
  `;

  root.appendChild(div);
}

function openCharacters() {
  currentPage = "characters";
  render();
}

function openPlots() {
  currentPage = "plots";
  render();
}

// =============== CHARACTER LIST ==================

function renderCharacterList(root) {
  const proj = projects[currentProject];
  const div = document.createElement("div");
  div.className = "page";

  div.innerHTML = `<h1>Characters</h1>
  <button onclick="newCharacter()">+ Add Character</button>`;

  proj.characters.forEach(c => {
    const card = document.createElement("div");
    card.className = "project-card";
    card.textContent = c.name;
    div.appendChild(card);
  });

  root.appendChild(div);
}

function newCharacter() {
  currentPage = "newCharacter";
  render();
}

// =============== CHARACTER TEMPLATE ===============

function renderCharacterTemplate(root) {
  const div = document.createElement("div");
  div.className = "page";
  div.innerHTML = `
    <h1>New Character</h1>
    <textarea id="charData" style="width:90%;height:400px;">
Character Name:
Physical Description:
Internal Conflict:
Misbelief:
Desire:
Fear:
Quirks:
Hobbies:
Song:
Quote:
    </textarea>
    <br><br>
    <button onclick="saveCharacter()">Save</button>
  `;

  root.appendChild(div);
}

function saveCharacter() {
  const text = document.getElementById("charData").value;
  const name = text.split("\n")[0].replace("Character Name:", "").trim();

  projects[currentProject].characters.push({ name, text });
  saveProjects();

  currentPage = "characters";
  render();
}

// =============== PLOT LIST ==================

function renderPlotList(root) {
  const proj = projects[currentProject];
  const div = document.createElement("div");
  div.className = "page";

  div.innerHTML = `<h1>Plots</h1>
  <button onclick="newPlot()">+ Add Plot</button>`;

  proj.plots.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "project-card";
    card.textContent = "Plot " + (i + 1);
    div.appendChild(card);
  });

  root.appendChild(div);
}

function newPlot() {
  currentPage = "newPlot";
  render();
}

// =============== PLOT TEMPLATE ===============

function renderPlotTemplate(root) {
  const div = document.createElement("div");
  div.className = "page";
  div.innerHTML = `
    <h1>New Plot</h1>
    <textarea id="plotData" style="width:90%;height:500px;">
Act 1 - Exposition:
Inciting Incident:
Plot Point One:
Act 2 - Rising Action:
Midpoint:
Plot Point Two:
Act 3 - Climax:
Denouement:
    </textarea>
    <br><br>
    <button onclick="savePlot()">Save</button>
  `;
  root.appendChild(div);
}

function savePlot() {
  const text = document.getElementById("plotData").value;

  projects[currentProject].plots.push({ text });
  saveProjects();

  currentPage = "plots";
  render();
}

// INITIAL RENDER
render();
