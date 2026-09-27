
// Image protection: discourage casual saving/copying of preview images.
document.addEventListener("contextmenu", (e) => {
  if (e.target && e.target.tagName === "IMG") {
    e.preventDefault();
  }
});

document.addEventListener("dragstart", (e) => {
  if (e.target && e.target.tagName === "IMG") {
    e.preventDefault();
  }
});

document.addEventListener("selectstart", (e) => {
  if (e.target && e.target.tagName === "IMG") {
    e.preventDefault();
  }
});

let photos = [];
let map, markers = [], selectedId = null;
let currentYear = "all", currentArea = "all", query = "", cart = 0;
const $ = s => document.querySelector(s);

async function loadPhotos() {
  const r = await fetch(`data/photos.json?ts=${Date.now()}`, {cache:"no-store"});
  const d = await r.json();
  photos = Array.isArray(d) ? d : (d.photos || []);
}

function initMap() {
  map = L.map("map", {zoomControl:true}).setView([35.6812,139.7671],11);
  L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {
    maxZoom:18, attribution:"© 国土地理院"
  }).addTo(map);
}

function markerIcon() {
  return L.divIcon({className:"", html:'<div class="memory-marker"></div>',
    iconSize:[22,22], iconAnchor:[11,22], popupAnchor:[0,-20]});
}

function filteredPhotos() {
  return photos.filter(p => {
    const y = Number(p.year_sort ?? p.year);
    const yearOK = currentYear==="all" || (y>=Number(currentYear)&&y<Number(currentYear)+10);
    const areaOK = currentArea==="all" || !p.area || p.area===currentArea;
    const q = query.trim().toLowerCase();
    const text = [p.title,p.area,p.description,p.original_filename,p.year_label,p.year,p.lat,p.lon]
      .filter(v=>v!==undefined&&v!==null).join(" ").toLowerCase();
    return yearOK && areaOK && (!q || text.includes(q));
  });
}

function renderMarkers(list) {
  markers.forEach(m=>map.removeLayer(m)); markers=[];
  list.forEach(p=>{
    if(p.lat==null||p.lon==null) return;
    const m=L.marker([p.lat,p.lon],{icon:markerIcon()}).addTo(map);
    m.bindTooltip(`${p.title||"東京の記憶"} / ${p.year_label||p.year||""}`,
      {direction:"top",offset:[0,-16]});
    m.on("click",()=>selectPhoto(p.id)); markers.push(m);
  });
}

function renderList(list) {
  const el=$("#photoList"); el.innerHTML="";
  list.forEach(p=>{
    const b=document.createElement("button"); b.className="photo-item"+(p.id===selectedId?" active":"");
    b.innerHTML=`<img src="${p.image}" alt=""><span>
      <strong>${p.title||"東京の記憶"}</strong>
      <span>${p.year_label||p.year||"年代不明"}${p.area?" / "+p.area:""}</span>
      <span>⌖ ${Number(p.lat).toFixed(4)}, ${Number(p.lon).toFixed(4)}</span></span>`;
    b.onclick=()=>{ selectPhoto(p.id, false); openLightbox(p); }; el.appendChild(b);
  });
}

function selectPhoto(id, fly=true) {
  const p=photos.find(x=>x.id===id); if(!p)return; selectedId=id;
  $("#detailImage").src=p.image; $("#detailImage").alt=p.title||"";
  $("#detailMeta").textContent=`${p.year_label||p.year||"年代不明"}${p.area?" / "+p.area:""}`;
  $("#detailTitle").textContent=p.title||"東京の記憶";
  $("#detailDescription").textContent=p.description||"この写真についての記録はありません。";
  $("#detailCoordinates").textContent=`LAT ${Number(p.lat).toFixed(6)} / LON ${Number(p.lon).toFixed(6)}`;
  $("#purchaseButton").disabled=false; $("#purchaseButton").onclick=()=>openPurchase(p);
  $("#detailImage").style.cursor="zoom-in"; $("#detailImage").onclick=()=>openLightbox(p);
  renderList(filteredPhotos());
  if(fly && p.lat!=null&&p.lon!=null) map.flyTo([p.lat,p.lon],Math.max(map.getZoom(),13),{duration:.7});
}

function render() {
  const list=filteredPhotos(); $("#resultCount").textContent=list.length;
  renderList(list); renderMarkers(list);
}

function openLightbox(p) {
  $("#lightboxImage").src=p.image;
  $("#lightboxImage").alt=p.title||"";
  $("#lightboxMeta").textContent=`${p.year_label||p.year||"年代不明"}${p.area?" / "+p.area:""}`;
  $("#lightboxTitle").textContent=p.title||"東京の記憶";
  $("#lightboxDescription").textContent=p.description||"";
  $("#lightboxLocation").innerHTML=`<strong>⌖ 撮影地点</strong><br>LAT ${Number(p.lat).toFixed(6)}<br>LON ${Number(p.lon).toFixed(6)}`;
  $("#photoLightbox").classList.add("open");
  $("#photoLightbox").setAttribute("aria-hidden","false");
  document.body.classList.add("lightbox-open");
  $("#lightboxPurchase").onclick=()=>{closeLightbox();openPurchase(p);};
}
function closeLightbox(){
  $("#photoLightbox").classList.remove("open");
  $("#photoLightbox").setAttribute("aria-hidden","true");
  document.body.classList.remove("lightbox-open");
}

function openPurchase(p){
  $("#modalTitle").textContent=p.title||"写真を購入する";
  $("#modalDescription").textContent=`${p.year_label||p.year||"年代不明"}${p.area?"・"+p.area:""}で撮影された写真です。`;
  $("#purchaseModal").classList.add("open"); $("#purchaseModal").setAttribute("aria-hidden","false");
}
function closePurchase(){ $("#purchaseModal").classList.remove("open"); $("#purchaseModal").setAttribute("aria-hidden","true"); }
function addToCart(type){cart++;$("#cartCount").textContent=cart;closePurchase();alert(type==="commercial"?"商用ライセンスのお問い合わせフォームへ接続する想定です。":"カートに追加しました。");}

async function refreshData(){
  const oldId=selectedId;
  try { await loadPhotos(); render(); if(oldId&&photos.some(p=>p.id===oldId)) selectPhoto(oldId); }
  catch(e){ console.error(e); }
}

document.addEventListener("DOMContentLoaded", async()=>{
  initMap();
  try{await loadPhotos();}catch(e){console.error(e);}
  render(); if(photos.length)selectPhoto(photos[0].id);

  $("#searchInput").oninput=e=>{query=e.target.value;render();};
  document.querySelectorAll("#yearFilters .pill").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("#yearFilters .pill").forEach(x=>x.classList.remove("active"));
    b.classList.add("active"); currentYear=b.dataset.year; render();
  });
  $("#areaFilter").onchange=e=>{currentArea=e.target.value;render();};
  $("#searchFocus").onclick=()=>{document.querySelector("#map-section").scrollIntoView({behavior:"smooth"});$("#searchInput").focus();};
  $("#cartButton").onclick=()=>alert(`カート：${cart}件`);
  document.querySelectorAll("[data-close-modal]").forEach(x=>x.onclick=closePurchase);
  document.querySelectorAll("[data-close-lightbox]").forEach(x=>x.onclick=closeLightbox);
  document.querySelectorAll(".purchase-option").forEach(x=>x.onclick=()=>addToCart(x.dataset.type));
  document.querySelectorAll(".collection-card").forEach(x=>x.onclick=()=>{
    query=x.dataset.search||"";$("#searchInput").value=query;
    document.querySelector("#map-section").scrollIntoView({behavior:"smooth"});render();
  });
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeLightbox();closePurchase();}});
  setInterval(refreshData,5000);
});
