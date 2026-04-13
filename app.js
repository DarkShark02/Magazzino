let currentMagazzino = null;

function normalize(s){ return (s||"").toLowerCase().trim(); }

function createId(nome, scadenza){
  return normalize(nome)+"_"+scadenza;
}

function todayISO(){
  return new Date().toISOString().split("T")[0];
}

function daysTo(date){
  return Math.ceil((new Date(date)-new Date())/(1000*60*60*24));
}