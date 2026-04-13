function renderView(v){
  const map = {
    home: renderHome,
    magazzino: renderMagazzino,
    add: renderAdd,
    remove: renderRemove,
    list: renderList,
    edit: edit,
    scadenze: renderScadenze
  };

  if(map[v]) map[v]();
}

/* ---------------- HELPERS ---------------- */

function formatDate(d){
  if(!d) return "";
  const [y,m,day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function isNearExpiry(date){
  return daysTo(date) <= 30;
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
  const n = prompt("Nome magazzino");
  if(!n) return;
  addMagazzino(n);
  renderView("home");
}

function openMagazzino(id,nome){
  currentMagazzino = {id,nome};
  renderView("magazzino");
}

/* ---------------- MAGAZZINO ---------------- */

function renderMagazzino(){
  getProdotti(p=>{

    const exp = p.filter(x => isNearExpiry(x.scadenza));

    document.getElementById("app").innerHTML=`
      <div class="container">

        <h1>🥩 ${currentMagazzino.nome}</h1>

        ${exp.length ? `<div class="alert">⚠️ Prodotti in scadenza</div>` : ""}

        <button class="btn" onclick="renderAdd()">➕ Inserisci</button>
        <button class="btn-danger" onclick="renderRemove()">➖ Rimuovi</button>
        <button class="btn-secondary" onclick="renderList()">📦 Lista</button>
        <button class="btn-secondary" onclick="renderScadenze()">📅 Scadenze</button>

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

    const input = document.getElementById("name");
    const box = document.getElementById("suggest");

    input.addEventListener("input",()=>{

      const q = normalize(input.value);
      if(!q){
        box.innerHTML="";
        return;
      }

      const matches = prodotti
        .filter(p => normalize(p.nome).includes(q))
        .slice(0,6);

      box.innerHTML = matches.map(p=>`
        <div class="suggestItem"
          onclick="selectAdd('${p.nome}','${p.scadenza}')">
          ${p.nome} — ${formatDate(p.scadenza)}
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

  const nome = document.getElementById("name").value;
  const qty = parseInt(document.getElementById("qty").value);
  const scadenza = document.getElementById("date").value;

  if(!nome || !qty || !scadenza) return alert("Obbligatorio");

  const id = crypto.randomUUID();

  getProdotti(p=>{

    let ex = p.find(x =>
      x.nome === nome && x.scadenza === scadenza
    );

    if(ex){
      ex.quantita += qty;
      saveProdotto(ex);
    } else {
      saveProdotto({id, nome, quantita: qty, scadenza});
    }

    renderView("magazzino");
  });
}

/* ---------------- REMOVE ---------------- */

function renderRemove(){

  getProdotti(prodotti=>{

    document.getElementById("app").innerHTML=`
      <div class="container">

        <h2>➖ Rimozione</h2>

        <input id="name" placeholder="Nome prodotto">
        <div id="suggest" class="suggestBox"></div>

        <input id="date" type="date">
        <input id="qty" type="number" placeholder="Quantità">

        <button class="btn-danger" onclick="saveRemove()">RIMUOVI</button>
        <button class="btn-secondary" onclick="renderMagazzino()">← Indietro</button>

      </div>
    `;

    const input = document.getElementById("name");
    const box = document.getElementById("suggest");

    input.addEventListener("input",()=>{

      const q = normalize(input.value);
      if(!q){
        box.innerHTML="";
        return;
      }

      const matches = prodotti
        .filter(p => normalize(p.nome).includes(q))
        .slice(0,6);

      box.innerHTML = matches.map(p=>`
        <div class="suggestItem"
          onclick="selectRemove('${p.nome}','${p.scadenza}')">
          ${p.nome} — ${formatDate(p.scadenza)}
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

  const nome = document.getElementById("name").value;
  const date = document.getElementById("date").value;
  const qty = parseInt(document.getElementById("qty").value);

  getProdotti(p=>{

    let prod = p.find(x =>
      x.nome === nome && x.scadenza === date
    );

    if(!prod){
      alert("Prodotto non trovato");
      return;
    }

    prod.quantita -= qty;

    if(prod.quantita <= 0){
      const tx = db.transaction("prodotti","readwrite");
      tx.objectStore("prodotti").delete(prod.id);
    } else {
      saveProdotto(prod);
    }

    renderMagazzino();
  });
}

/* ---------------- LISTA ---------------- */

function renderList(){

  getProdotti(p=>{

    p = p.sort((a,b)=> new Date(a.scadenza)-new Date(b.scadenza));

    document.getElementById("app").innerHTML=`
      <div class="container">

        <h2>📦 Lista prodotti</h2>

        <div class="productHeader">
          <div class="col">Nome</div>
          <div class="col">Scadenza</div>
          <div class="col">Qta</div>
          <div class="col"></div>
        </div>

        ${p.map(x=>`
          <div class="productRow">
            <div class="col">${x.nome}</div>
            <div class="col">${formatDate(x.scadenza)}</div>
            <div class="col">${x.quantita}</div>

            <div class="col right">
              <button class="editBtn" onclick="edit('${x.id}')">✏️</button>
              <button class="editBtn" onclick="deleteProd('${x.id}')">🗑️</button>
            </div>
          </div>
        `).join("")}

        <button class="btn-secondary" onclick="renderView('magazzino')">← Indietro</button>
      </div>
    `;
  });
}

/* ---------------- EDIT ---------------- */

function edit(id){

  getProdotti(p=>{
    const prod = p.find(x=>x.id===id);

    document.getElementById("app").innerHTML=`
      <div class="container">

        <h2>✏️ Modifica</h2>

        <input id="name" value="${prod.nome}">
        <input id="qty" type="number" value="${prod.quantita}">
        <input id="date" type="date" value="${prod.scadenza}">

        <button class="btn" onclick="saveEdit('${id}')">SALVA</button>
        <button class="btn-secondary" onclick="renderView('list')">← Indietro</button>
      </div>
    `;
  });
}

function saveEdit(oldId){

  const nome = document.getElementById("name").value;
  const qty = parseInt(document.getElementById("qty").value);
  const scadenza = document.getElementById("date").value;

  getProdotti(p=>{

    const prod = p.find(x=>x.id===oldId);
    if(!prod) return;

    prod.nome = nome;
    prod.quantita = qty;
    prod.scadenza = scadenza;

    saveProdotto(prod);

    renderView("list");
  });
}

function deleteProd(id){

  if(!confirm("Sei sicuro di eliminare questo prodotto?"))
    return;

  const tx = db.transaction("prodotti","readwrite");
  tx.objectStore("prodotti").delete(id);

  tx.oncomplete = () => {
    renderView("list");
  };
}

/* ---------------- SCADENZE ---------------- */

function renderScadenze(){

  getProdotti(p=>{

    const list = p.filter(x => isNearExpiry(x.scadenza));

    document.getElementById("app").innerHTML=`
      <div class="container">

        <h2>📅 Scadenze</h2>

        ${list.map(x=>`
          <div class="card danger">
            ${x.nome} — ${formatDate(x.scadenza)}
          </div>
        `).join("")}

        <button class="btn-secondary" onclick="renderView('magazzino')">← Indietro</button>
      </div>
    `;
  });
}