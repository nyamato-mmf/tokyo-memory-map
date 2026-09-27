// ============================================================
// Image protection
// ============================================================

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


// ============================================================
// Global variables
// ============================================================

let photos = [];
let map;
let markers = [];
let selectedId = null;

let currentYear = "all";
let currentArea = "all";
let query = "";
let cart = 0;


// ============================================================
// Google Street View
// ============================================================

// ★ Google Maps APIキーをここ1か所だけに入れてください
const GOOGLE_MAPS_API_KEY = "AIzaSyAbKE8qps9Sjo11FSsF5Pc4GDM9XUsuH4U";

let googleMapsReady = null;

let streetViewPanorama = null;
let streetViewService = null;

let streetViewPanel = null;
let streetViewPano = null;

let streetViewPhoto = null;
let streetViewButton = null;


// ============================================================
// Utility
// ============================================================

const $ = s => document.querySelector(s);


// ============================================================
// Google Maps JavaScript API loading
// ============================================================

function loadGoogleMapsAPI() {

  if (googleMapsReady) {
    return googleMapsReady;
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(
      new Error(
        "Google Maps APIキーが設定されていません。"
      )
    );
  }

  googleMapsReady = new Promise(
    (resolve, reject) => {

      // すでに読み込まれている場合
      if (
        window.google &&
        window.google.maps
      ) {
        resolve(
          window.google.maps
        );
        return;
      }

      // 既存scriptがある場合
      const existing =
        document.querySelector(
          'script[data-google-maps-api="true"]'
        );

      if (existing) {

        existing.addEventListener(
          "load",
          () => {
            resolve(
              window.google.maps
            );
          },
          { once: true }
        );

        existing.addEventListener(
          "error",
          () => {
            reject(
              new Error(
                "Google Maps APIの読み込みに失敗しました。"
              )
            );
          },
          { once: true }
        );

        return;
      }

      // Google Maps JavaScript APIを読み込む
      const script =
        document.createElement(
          "script"
        );

      script.src =
        "https://maps.googleapis.com/maps/api/js" +
        "?key=" +
        encodeURIComponent(
          GOOGLE_MAPS_API_KEY
        ) +
        "&v=weekly&loading=async";

      script.async = true;
      script.defer = true;

      script.dataset.googleMapsApi =
        "true";

      script.onload = () => {
        resolve(
          window.google.maps
        );
      };

      script.onerror = () => {
        reject(
          new Error(
            "Google Maps APIの読み込みに失敗しました。"
          )
        );
      };

      document.head.appendChild(
        script
      );
    }
  );

  return googleMapsReady;
}


// ============================================================
// Street View button in Lightbox
// ============================================================

function createStreetViewButton() {

  if (streetViewButton) {
    return;
  }

  const locationEl =
    $("#lightboxLocation");

  if (!locationEl) {
    return;
  }

  streetViewButton =
    document.createElement(
      "button"
    );

  streetViewButton.type =
    "button";

  streetViewButton.textContent =
    "📍 現在の景色を見る";

  streetViewButton.className =
    "streetview-lightbox-button";

  Object.assign(
    streetViewButton.style,
    {
      display: "block",
      marginTop: "12px",
      width: "100%",

      border: "0",
      borderRadius: "8px",

      padding: "10px 12px",

      background: "#333",
      color: "#fff",

      fontSize: "14px",
      fontWeight: "600",

      cursor: "pointer"
    }
  );

  streetViewButton.addEventListener(
    "click",
    () => {

      if (streetViewPhoto) {
        openStreetViewForPhoto(
          streetViewPhoto
        );
      }

    }
  );

  if (
    locationEl.parentElement
  ) {
    locationEl.parentElement.appendChild(
      streetViewButton
    );
  }
}


// ============================================================
// Street View panel
// ============================================================

function createStreetViewPanel() {

  if (streetViewPanel) {
    return;
  }

  const lightbox =
    $("#photoLightbox");

  if (!lightbox) {
    return;
  }


  // ----------------------------------------------------------
  // Panel
  // ----------------------------------------------------------

  streetViewPanel =
    document.createElement(
      "div"
    );

  streetViewPanel.id =
    "streetview-lightbox-panel";

  Object.assign(
    streetViewPanel.style,
    {
      position: "absolute",
      inset: "0",

      zIndex: "20",

      display: "none",

      background: "#111"
    }
  );


  // ----------------------------------------------------------
  // Header
  // ----------------------------------------------------------

  const header =
    document.createElement(
      "div"
    );

  Object.assign(
    header.style,
    {
      position: "absolute",

      top: "12px",
      left: "12px",
      right: "12px",

      zIndex: "30",

      display: "flex",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      gap: "12px",

      pointerEvents:
        "none"
    }
  );


  // ----------------------------------------------------------
  // Title
  // ----------------------------------------------------------

  const title =
    document.createElement(
      "div"
    );

  title.textContent =
    "現在のStreet View";

  Object.assign(
    title.style,
    {
      padding:
        "8px 12px",

      borderRadius:
        "8px",

      background:
        "rgba(0,0,0,.72)",

      color: "#fff",

      fontSize:
        "14px",

      fontWeight:
        "600"
    }
  );


  // ----------------------------------------------------------
  // Close button
  // ----------------------------------------------------------

  const close =
    document.createElement(
      "button"
    );

  close.type =
    "button";

  close.textContent =
    "× 写真に戻る";

  Object.assign(
    close.style,
    {
      border: "0",

      borderRadius:
        "8px",

      padding:
        "9px 12px",

      background:
        "rgba(255,255,255,.95)",

      color:
        "#222",

      fontSize:
        "14px",

      fontWeight:
        "600",

      cursor:
        "pointer",

      boxShadow:
        "0 2px 8px rgba(0,0,0,.25)",

      pointerEvents:
        "auto"
    }
  );

  close.addEventListener(
    "click",
    closeStreetView
  );


  header.appendChild(
    title
  );

  header.appendChild(
    close
  );


  // ----------------------------------------------------------
  // Panorama container
  // ----------------------------------------------------------

  streetViewPano =
    document.createElement(
      "div"
    );

  Object.assign(
    streetViewPano.style,
    {
      position:
        "absolute",

      inset:
        "0"
    }
  );


  streetViewPanel.appendChild(
    streetViewPano
  );

  streetViewPanel.appendChild(
    header
  );

  lightbox.appendChild(
    streetViewPanel
  );
}


// ============================================================
// Open Street View
// ============================================================

async function openStreetViewForPhoto(
  p
) {

  if (
    !p ||
    p.lat == null ||
    p.lon == null
  ) {

    alert(
      "この写真には撮影地点の緯度・経度が登録されていません。"
    );

    return;
  }


  createStreetViewButton();
  createStreetViewPanel();


  if (
    !streetViewPanel ||
    !streetViewPano
  ) {
    return;
  }


  if (streetViewButton) {

    streetViewButton.disabled =
      true;

    streetViewButton.textContent =
      "Street Viewを確認中…";
  }


  try {

    // --------------------------------------------------------
    // Google Maps API
    // --------------------------------------------------------

    await loadGoogleMapsAPI();


    // --------------------------------------------------------
    // Street View library
    // --------------------------------------------------------

    const {
      StreetViewService,
      StreetViewSource,
      StreetViewPreference
    } =
      await google.maps.importLibrary(
        "streetView"
      );


    if (!streetViewService) {

      streetViewService =
        new StreetViewService();
    }


    // --------------------------------------------------------
    // ★屋外のみ検索
    // --------------------------------------------------------
    //
    // sources:
    //   OUTDOOR
    //
    // preference:
    //   NEAREST
    //
    // 写真の撮影地点から50m以内で、
    // 最も近い屋外Street Viewを探します。
    //

    const result =
      await streetViewService.getPanorama(
        {
          location: {
            lat:
              Number(p.lat),

            lng:
              Number(p.lon)
          },

          radius:
            50,

          preference:
            StreetViewPreference.NEAREST,

          sources:
            [
              StreetViewSource.OUTDOOR
            ]
        }
      );


    // --------------------------------------------------------
    // Street Viewが見つからない場合
    // --------------------------------------------------------

    if (
      !result ||
      !result.data ||
      !result.data.location
    ) {

      alert(
        "この撮影地点の近くには、屋外のGoogle Street Viewが見つかりませんでした。"
      );

      return;
    }


    // --------------------------------------------------------
    // 見つかったパノラマ位置
    // --------------------------------------------------------

    const position =
      result.data.location.latLng;


    // --------------------------------------------------------
    // StreetViewPanorama
    // --------------------------------------------------------

    const {
      StreetViewPanorama
    } =
      await google.maps.importLibrary(
        "streetView"
      );


    if (
      !streetViewPanorama
    ) {

      streetViewPanorama =
        new StreetViewPanorama(
          streetViewPano,
          {
            position:

              position,

            pov: {
              heading:
                0,

              pitch:
                0
            },

            zoom:
              1,

            addressControl:
              true,

            linksControl:
              true,

            panControl:
              true,

            fullscreenControl:
              true,

            motionTracking:
              false,

            enableCloseButton:
              false
          }
        );

    } else {

      streetViewPanorama.setPosition(
        position
      );

      streetViewPanorama.setVisible(
        true
      );
    }


    // --------------------------------------------------------
    // 表示
    // --------------------------------------------------------

    streetViewPanel.style.display =
      "block";


  } catch (e) {

    console.error(
      "Street View error:",
      e
    );

    alert(
      "Street Viewを読み込めませんでした。\n\n" +
      (
        e.message ||
        e
      )
    );

  } finally {

    if (streetViewButton) {

      streetViewButton.disabled =
        false;

      streetViewButton.textContent =
        "📍 現在の景色を見る";
    }
  }
}


// ============================================================
// Close Street View
// ============================================================

function closeStreetView() {

  if (
    streetViewPanorama
  ) {

    streetViewPanorama.setVisible(
      false
    );
  }


  if (
    streetViewPanel
  ) {

    streetViewPanel.style.display =
      "none";
  }
}


// ============================================================
// Load photos
// ============================================================

async function loadPhotos() {

  const r =
    await fetch(
      `data/photos.json?ts=${Date.now()}`,
      {
        cache:
          "no-store"
      }
    );

  const d =
    await r.json();

  photos =
    Array.isArray(d)
      ? d
      : (
          d.photos ||
          []
        );
}


// ============================================================
// Map
// ============================================================

function initMap() {

  map =
    L.map(
      "map",
      {
        zoomControl:
          true
      }
    ).setView(
      [
        35.6812,
        139.7671
      ],
      11
    );


  // ----------------------------------------------------------
  // 国土地理院・淡色地図
  // ----------------------------------------------------------

  L.tileLayer(
    "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
    {
      maxZoom:
        18,

      attribution:
        "© 国土地理院"
    }
  ).addTo(
    map
  );
}


// ============================================================
// Marker icon
// ============================================================

function markerIcon() {

  return L.divIcon(
    {
      className:
        "",

      html:
        '<div class="memory-marker"></div>',

      iconSize:
        [22, 22],

      iconAnchor:
        [11, 22],

      popupAnchor:
        [0, -20]
    }
  );
}


// ============================================================
// Filtered photos
// ============================================================

function filteredPhotos() {

  return photos.filter(
    p => {

      const y =
        Number(
          p.year_sort ??
          p.year
        );


      // 年代フィルター

      const yearOK =
        currentYear ===
          "all" ||

        (
          y >=
            Number(
              currentYear
            )

          &&

          y <
            Number(
              currentYear
            ) +
            10
        );


      // Area filter

      const areaOK =
        currentArea ===
          "all" ||

        !p.area ||

        p.area ===
          currentArea;


      // Search

      const q =
        query
          .trim()
          .toLowerCase();


      const text =
        [
          p.title,
          p.area,
          p.description,
          p.original_filename,
          p.year_label,
          p.year,
          p.lat,
          p.lon
        ]
          .filter(
            v =>
              v !==
                undefined &&

              v !==
                null
          )
          .join(" ")
          .toLowerCase();


      return (
        yearOK &&
        areaOK &&
        (
          !q ||
          text.includes(q)
        )
      );
    }
  );
}


// ============================================================
// Render markers
// ============================================================

function renderMarkers(
  list
) {

  markers.forEach(
    m =>
      map.removeLayer(
        m
      )
  );

  markers = [];


  list.forEach(
    p => {

      if (
        p.lat == null ||
        p.lon == null
      ) {
        return;
      }


      const m =
        L.marker(
          [
            p.lat,
            p.lon
          ],
          {
            icon:
              markerIcon()
          }
        ).addTo(
          map
        );


      m.bindTooltip(
        `${
          p.title ||
          "東京の記憶"
        } / ${
          p.year_label ||
          p.year ||
          ""
        }`,
        {
          direction:
            "top",

          offset:
            [0, -16]
        }
      );


      m.on(
        "click",
        () =>
          selectPhoto(
            p.id
          )
      );


      markers.push(
        m
      );
    }
  );
}


// ============================================================
// Render photo list
// ============================================================

function renderList(
  list
) {

  const el =
    $("#photoList");

  el.innerHTML =
    "";


  list.forEach(
    p => {

      const b =
        document.createElement(
          "button"
        );


      b.className =
        "photo-item" +

        (
          p.id ===
            selectedId
            ? " active"
            : ""
        );


      b.innerHTML = `
        <img src="${p.image}" alt="">

        <span>

          <strong>
            ${
              p.title ||
              "東京の記憶"
            }
          </strong>

          <span>
            ${
              p.year_label ||
              p.year ||
              "年代不明"
            }

            ${
              p.area
                ? " / " +
                  p.area
                : ""
            }
          </span>

          <span>
            ⌖
            ${
              Number(
                p.lat
              ).toFixed(4)
            },
            ${
              Number(
                p.lon
              ).toFixed(4)
            }
          </span>

        </span>
      `;


      b.onclick =
        () => {

          selectPhoto(
            p.id,
            false
          );

          openLightbox(
            p
          );
        };


      el.appendChild(
        b
      );
    }
  );
}


// ============================================================
// Select photo
// ============================================================

function selectPhoto(
  id,
  fly = true
) {

  const p =
    photos.find(
      x =>
        x.id ===
        id
    );


  if (!p) {
    return;
  }


  selectedId =
    id;


  $("#detailImage").src =
    p.image;

  $("#detailImage").alt =
    p.title ||
    "";


  $("#detailMeta").textContent =
    `${
      p.year_label ||
      p.year ||
      "年代不明"
    }${
      p.area
        ? " / " +
          p.area
        : ""
    }`;


  $("#detailTitle").textContent =
    p.title ||
    "東京の記憶";


  $("#detailDescription").textContent =
    p.description ||
    "この写真についての記録はありません。";


  $("#detailCoordinates").textContent =
    `LAT ${
      Number(
        p.lat
      ).toFixed(6)
    } / LON ${
      Number(
        p.lon
      ).toFixed(6)
    }`;


  $("#purchaseButton").disabled =
    false;


  $("#purchaseButton").onclick =
    () =>
      openPurchase(
        p
      );


  $("#detailImage").style.cursor =
    "zoom-in";


  $("#detailImage").onclick =
    () =>
      openLightbox(
        p
      );


  renderList(
    filteredPhotos()
  );


  // 地図を撮影地点へ移動

  if (
    fly &&
    p.lat != null &&
    p.lon != null
  ) {

    map.flyTo(
      [
        p.lat,
        p.lon
      ],

      Math.max(
        map.getZoom(),
        13
      ),

      {
        duration:
          0.7
      }
    );
  }
}


// ============================================================
// Render
// ============================================================

function render() {

  const list =
    filteredPhotos();


  $("#resultCount").textContent =
    list.length;


  renderList(
    list
  );


  renderMarkers(
    list
  );
}


// ============================================================
// Lightbox
// ============================================================

function openLightbox(
  p
) {

  // Street Viewを閉じる

  closeStreetView();


  streetViewPhoto =
    p;


  // ----------------------------------------------------------
  // Photo
  // ----------------------------------------------------------

  $("#lightboxImage").src =
    p.image;

  $("#lightboxImage").alt =
    p.title ||
    "";


  // ----------------------------------------------------------
  // Meta
  // ----------------------------------------------------------

  $("#lightboxMeta").textContent =
    `${
      p.year_label ||
      p.year ||
      "年代不明"
    }${
      p.area
        ? " / " +
          p.area
        : ""
    }`;


  // ----------------------------------------------------------
  // Title
  // ----------------------------------------------------------

  $("#lightboxTitle").textContent =
    p.title ||
    "東京の記憶";


  // ----------------------------------------------------------
  // Description
  // ----------------------------------------------------------

  $("#lightboxDescription").textContent =
    p.description ||
    "";


  // ----------------------------------------------------------
  // Location
  // ----------------------------------------------------------

  $("#lightboxLocation").innerHTML =
    `<strong>⌖ 撮影地点</strong><br>` +

    `LAT ${
      Number(
        p.lat
      ).toFixed(6)
    }<br>` +

    `LON ${
      Number(
        p.lon
      ).toFixed(6)
    }`;


  // ----------------------------------------------------------
  // Street View button
  // ----------------------------------------------------------

  createStreetViewButton();


  if (streetViewButton) {

    const hasCoordinates =
      p.lat != null &&
      p.lon != null;


    streetViewButton.style.display =
      hasCoordinates
        ? "block"
        : "none";


    streetViewButton.disabled =
      false;


    streetViewButton.textContent =
      "📍 現在の景色を見る";
  }


  // ----------------------------------------------------------
  // Open Lightbox
  // ----------------------------------------------------------

  $("#photoLightbox").classList.add(
    "open"
  );


  $("#photoLightbox").setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "lightbox-open"
  );


  // ----------------------------------------------------------
  // Purchase
  // ----------------------------------------------------------

  $("#lightboxPurchase").onclick =
    () => {

      closeLightbox();

      openPurchase(
        p
      );
    };
}


// ============================================================
// Close Lightbox
// ============================================================

function closeLightbox() {

  closeStreetView();


  streetViewPhoto =
    null;


  $("#photoLightbox").classList.remove(
    "open"
  );


  $("#photoLightbox").setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "lightbox-open"
  );
}


// ============================================================
// Purchase
// ============================================================

function openPurchase(
  p
) {

  $("#modalTitle").textContent =
    p.title ||
    "写真を購入する";


  $("#modalDescription").textContent =
    `${
      p.year_label ||
      p.year ||
      "年代不明"
    }${
      p.area
        ? "・" +
          p.area
        : ""
    }で撮影された写真です。`;


  $("#purchaseModal").classList.add(
    "open"
  );


  $("#purchaseModal").setAttribute(
    "aria-hidden",
    "false"
  );
}


function closePurchase() {

  $("#purchaseModal").classList.remove(
    "open"
  );


  $("#purchaseModal").setAttribute(
    "aria-hidden",
    "true"
  );
}


function addToCart(
  type
) {

  cart++;


  $("#cartCount").textContent =
    cart;


  closePurchase();


  alert(
    type ===
      "commercial"

      ? "商用ライセンスのお問い合わせフォームへ接続する想定です。"

      : "カートに追加しました。"
  );
}


// ============================================================
// Refresh data
// ============================================================

async function refreshData() {

  const oldId =
    selectedId;


  try {

    await loadPhotos();

    render();


    if (
      oldId &&
      photos.some(
        p =>
          p.id ===
          oldId
      )
    ) {

      selectPhoto(
        oldId
      );
    }


  } catch (e) {

    console.error(
      e
    );
  }
}


// ============================================================
// DOMContentLoaded
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    // --------------------------------------------------------
    // Map
    // --------------------------------------------------------

    initMap();


    // --------------------------------------------------------
    // Photos
    // --------------------------------------------------------

    try {

      await loadPhotos();

    } catch (e) {

      console.error(
        e
      );
    }


    render();


    if (photos.length) {

      selectPhoto(
        photos[0].id
      );
    }


    // --------------------------------------------------------
    // Search
    // --------------------------------------------------------

    $("#searchInput").oninput =
      e => {

        query =
          e.target.value;

        render();
      };


    // --------------------------------------------------------
    // Year filter
    // --------------------------------------------------------

    document
      .querySelectorAll(
        "#yearFilters .pill"
      )
      .forEach(
        b => {

          b.onclick =
            () => {

              document
                .querySelectorAll(
                  "#yearFilters .pill"
                )
                .forEach(
                  x =>
                    x.classList.remove(
                      "active"
                    )
                );


              b.classList.add(
                "active"
              );


              currentYear =
                b.dataset.year;


              // 年代による写真絞り込みだけ行う
              // 地図は常に国土地理院の淡色地図

              render();
            };
        }
      );


    // --------------------------------------------------------
    // Area filter
    // --------------------------------------------------------

    $("#areaFilter").onchange =
      e => {

        currentArea =
          e.target.value;

        render();
      };


    // --------------------------------------------------------
    // Search focus
    // --------------------------------------------------------

    $("#searchFocus").onclick =
      () => {

        document
          .querySelector(
            "#map-section"
          )
          .scrollIntoView(
            {
              behavior:
                "smooth"
            }
          );


        $("#searchInput").focus();
      };


    // --------------------------------------------------------
    // Cart
    // --------------------------------------------------------

    $("#cartButton").onclick =
      () =>
        alert(
          `カート：${cart}件`
        );


    // --------------------------------------------------------
    // Modal close
    // --------------------------------------------------------

    document
      .querySelectorAll(
        "[data-close-modal]"
      )
      .forEach(
        x =>
          x.onclick =
            closePurchase
      );


    // --------------------------------------------------------
    // Lightbox close
    // --------------------------------------------------------

    document
      .querySelectorAll(
        "[data-close-lightbox]"
      )
      .forEach(
        x =>
          x.onclick =
            closeLightbox
      );


    // --------------------------------------------------------
    // Purchase option
    // --------------------------------------------------------

    document
      .querySelectorAll(
        ".purchase-option"
      )
      .forEach(
        x =>
          x.onclick =
            () =>
              addToCart(
                x.dataset.type
              )
      );


    // --------------------------------------------------------
    // Collection cards
    // --------------------------------------------------------

    document
      .querySelectorAll(
        ".collection-card"
      )
      .forEach(
        x =>
          x.onclick =
            () => {

              query =
                x.dataset.search ||
                "";


              $("#searchInput").value =
                query;


              document
                .querySelector(
                  "#map-section"
                )
                .scrollIntoView(
                  {
                    behavior:
                      "smooth"
                  }
                );


              render();
            }
      );


    // --------------------------------------------------------
    // Escape key
    // --------------------------------------------------------

    document.addEventListener(
      "keydown",
      e => {

        if (
          e.key ===
          "Escape"
        ) {

          closeStreetView();

          closeLightbox();

          closePurchase();
        }
      }
    );


    // --------------------------------------------------------
    // Auto refresh
    // --------------------------------------------------------

    setInterval(
      refreshData,
      5000
    );
  }
);