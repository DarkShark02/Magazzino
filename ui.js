function renderView(v){
  if(v==="home") renderHome();
  if(v==="magazzino") renderMagazzino();
  if(v==="add") renderAdd();
  if(v==="remove") renderRemove();
  if(v==="list") renderList();
  if(v==="edit") renderEdit();
  if(v==="scadenze") renderScadenze();
}

/* ---------------- HOME ---------------- */

function renderHome(){
  getMagazzini(list=>{
    document.getElementById("app").innerHTML=`
      <div class="container">
        <h1>🥩 Magazzino</h1>

        <button class="btn" onclick="createMagazzino()">+ Magazzino</button>

        ${list.map(m=>`
          <button class="btn" onclick="openMagazzino('${m.id}','${m.nome}')">
            ${m.nome}
          </button>
        `).join("")}
      </div>
    `;
  });
}

function createMagazzino(){
  const n=prompt("Nome");
  if(!n) return;
  addMagazzino(n);
  renderView("home");
}

function openMagazzino(id,nome){
  currentMagazzino={id,nome};
  renderView("magazzino");
}

/* ---------------- MAGAZZINO ---------------- */

function renderMagazzino(){
  getProdotti(p=>{

    const exp = p.filter(x=>daysTo(x.scadenza)<=30);

    document.getElementById("app").innerHTML=`
      <div class="container">

        <h1>🥩 ${currentMagazzino.nome}</h1>

        ${exp.length ? `<div class="alert">⚠️ Scadenze vicine</div>` : ""}

        <button class="btn" onclick="renderAdd()">➕ Inserisci Prodotto</button>
        <button class="btn-danger" onclick="renderRemove()">➖ Rimuovi Prodotto</button>
        <button class="btn-secondary" onclick="renderList()">📦 Lista Prodotti</button>
        <button class="btn-secondary" onclick="renderScadenze()">📅 Scadenze Prossime</button>

      </div>
    `;
  });
}

/* ---------------- ADD ---------------- */

function renderAdd(){

  getProdotti(prodotti=>{

    document.getElementById("app").innerHTML=`
      <div class="container">

        <h2>➕ Inserimento</h2>

        <input id="name" placeholder="Nome prodotto" autocomplete="off">
        <div id="suggest" class="suggestBox"></div>

        <input id="date" type="date" min="${todayISO()}">
        <input id="qty" type="number" placeholder="Quantità">

        <button class="btn" onclick="saveAdd()">SALVA</button>
        <button class="btn-secondary" onclick="renderView('magazzino')">← Indietro</button>
      </div>
    `;

    const input=document.getElementById("name");
    const box=document.getElementById("suggest");

    input.addEventListener("input",()=>{

      const q=normalize(input.value);

      if(!q){
        box.innerHTML="";
        return;
      }

      const matches = prodotti
        .filter(p => normalize(p.nome).includes(q))
        .slice(0, 6);

      box.innerHTML = matches.map(p => `
        <div class="suggestItem" onclick="selectAdd('${p.nome}','${p.scadenza}')">
          ${p.nome} — ${p.scadenza}
        </div>
      `).join("");
    });
  });
}

function selectAdd(nome, scadenza){
  document.getElementById("name").value = nome;
  document.getElementById("date").value = scadenza;
  document.getElementById("suggest").innerHTML = "";
}

function saveAdd(){
  const nome=document.getElementById("name").value;
  const qty=parseInt(document.getElementById("qty").value);
  const scadenza=document.getElementById("date").value;

  if(!nome||!qty||!scadenza) return alert("Obbligatorio");

  if(new Date(scadenza)<new Date(todayISO()))
    return alert("Data non valida");

  const id=createId(nome,scadenza);

  getProdotti(p=>{
    let ex=p.find(x=>x.id===id);

    if(ex) ex.quantita+=qty;
    else ex={id,nome,quantita:qty,scadenza};

    saveProdotto(ex);
    renderView("magazzino");
  });
}

/* ---------------- REMOVE ---------------- */

function renderRemove(){

  getProdotti(prodotti=>{

    document.getElementById("app").innerHTML=`
      <div class="container">

        <h2>➖ Rimozione prodotto</h2>

        <input id="name" placeholder="Nome prodotto" autocomplete="off">
        <div id="suggest" class="suggestBox"></div>

        <input id="date" type="date">
        <input id="qty" type="number" placeholder="Quantità">

        <button class="btn-danger" onclick="saveRemove()">RIMUOVI</button>
        <button class="btn-secondary" onclick="renderMagazzino()">← Indietro</button>

      </div>
    `;

    const input=document.getElementById("name");
    const box=document.getElementById("suggest");

    input.addEventListener("input",()=>{

      const q=normalize(input.value);

      if(!q){
        box.innerHTML="";
        return;
      }

      const matches = prodotti
        .filter(p => normalize(p.nome).includes(q))
        .slice(0, 6);

      box.innerHTML = matches.map(p => `
        <div class="suggestItem" onclick="selectRemove('${p.nome}','${p.scadenza}')">
          ${p.nome} — ${p.scadenza}
        </div>
      `).join("");
    });
  });
}

function selectRemove(nome, scadenza){
  document.getElementById("name").value = nome;
  document.getElementById("date").value = scadenza;
  document.getElementById("suggest").innerHTML = "";
}

function saveRemove(){

  const nome=document.getElementById("name").value;
  const date=document.getElementById("date").value;
  const qty=parseInt(document.getElementById("qty").value);

  const id=createId(nome,date);

  getProdotti(p=>{

    let prod=p.find(x=>x.id===id);

    if(!prod){
      alert("Prodotto non trovato");
      return;
    }

    prod.quantita -= qty;

    if(prod.quantita <= 0){
      const tx=db.transaction("prodotti","readwrite");
      tx.objectStore("prodotti").delete(id);
    } else {
      saveProdotto(prod);
    }

    renderMagazzino();
  });
}

/* ---------------- LISTA + EDIT ---------------- */

function renderList() {
  getProdotti(p => {

    document.getElementById("app").innerHTML = `
      <div class="container">
        <h2>📦 Prodotti</h2>

        <div class="productHeader">
          <div class="col">Nome</div>
          <div class="col">Scadenza</div>
          <div class="col">Qta</div>
          <div class="col"></div>
        </div>

        ${p.map(x => `
          <div class="productRow">
            <div class="col">${x.nome}</div>
            <div class="col">${x.scadenza}</div>
            <div class="col">${x.quantita}</div>

            <div class="col right">
              <button class="editBtn" onclick="edit('${x.id}')">✏️</button>
            </div>
          </div>
        `).join("")}

        <button class="btn-secondary" onclick="renderView('magazzino')">
          ← Indietro
        </button>
      </div>
    `;
  });
}

function edit(id){

  getProdotti(p=>{
    const prod=p.find(x=>x.id===id);

    document.getElementById("app").innerHTML=`
      <div class="container">

        <h2>✏️ Modifica</h2>

        <input id="name" value="${prod.nome}">
        <input id="qty" type="number" value="${prod.quantita}" readonly>
        <input id="date" type="date" value="${prod.scadenza}">

        <button class="btn" onclick="saveEdit('${id}')">SALVA</button>
        <button class="btn-secondary" onclick="renderView('list')">← Indietro</button>
      </div>
    `;
  });
}

function saveEdit(id){
  const nome=document.getElementById("name").value;
  const qty=parseInt(document.getElementById("qty").value);
  const scadenza=document.getElementById("date").value;

  saveProdotto({id,nome,quantita:qty,scadenza});
  renderView("list");
}

/* ---------------- SCADENZE ---------------- */

function renderScadenze(){
  getProdotti(p=>{

    const list=p.filter(x=>daysTo(x.scadenza)<=30);

    document.getElementById("app").innerHTML=`
      <div class="container">

        <h2>📅 Scadenze</h2>

        ${list.map(x=>`
          <div class="card danger">
            ${x.nome} - ${x.scadenza}
          </div>
        `).join("")}

        <button class="btn-secondary" onclick="renderView('magazzino')">← Indietro</button>
      </div>
    `;
  });
}