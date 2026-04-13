let db;

const request = indexedDB.open("magazzinoDB", 1);

request.onupgradeneeded = (e) => {
  db = e.target.result;

  db.createObjectStore("magazzini", { keyPath: "id" });
  db.createObjectStore("prodotti", { keyPath: "id" });
};

request.onsuccess = (e) => {
  db = e.target.result;

  getMagazzini(list => {
    if (list.length === 0) {
      const nome = prompt("Crea il tuo magazzino");
      if (nome) addMagazzino(nome);
    }

    getMagazzini(l => {
      currentMagazzino = l[0];
      renderView("magazzino");
    });
  });
};

/* ---------------- MAGAZZINI ---------------- */

function addMagazzino(nome) {
  const tx = db.transaction("magazzini", "readwrite");
  tx.objectStore("magazzini").put({
    id: "default",
    nome
  });
}

function getMagazzini(cb) {
  const tx = db.transaction("magazzini", "readonly");
  const req = tx.objectStore("magazzini").getAll();
  req.onsuccess = () => cb(req.result);
}

/* ---------------- PRODOTTI ---------------- */

function saveProdotto(p) {
  if (!p || !p.id) {
    console.error("Prodotto non valido", p);
    return;
  }

  const tx = db.transaction("prodotti", "readwrite");
  tx.objectStore("prodotti").put(p);
}

function getProdotti(cb) {
  const tx = db.transaction("prodotti", "readonly");
  const req = tx.objectStore("prodotti").getAll();
  req.onsuccess = () => cb(req.result);
}