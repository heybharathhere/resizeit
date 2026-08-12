(function () {
  "use strict";

  // ---- State ----
  let image = null; // { src, imgEl, name, origWidth, origHeight, origSizeKB }
  let aspect = 1;
  let mode = "px"; // "px" | "kb"
  let outputFormat = "image/jpeg";
  let outputURL = null;
  let isGenerating = false;

  // ---- Elements ----
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const browseBtn = document.getElementById("browseBtn");
  const replaceBtn = document.getElementById("replaceBtn");
  const dropInner = document.getElementById("dropInner");
  const previewWrap = document.getElementById("previewWrap");
  const previewImg = document.getElementById("previewImg");
  const metaRow = document.getElementById("metaRow");
  const metaOrig = document.getElementById("metaOrig");
  const errorBox = document.getElementById("errorBox");

  const modePxBtn = document.getElementById("modePxBtn");
  const modeKbBtn = document.getElementById("modeKbBtn");
  const pxControls = document.getElementById("pxControls");
  const kbControls = document.getElementById("kbControls");

  const widthInput = document.getElementById("widthInput");
  const widthSlider = document.getElementById("widthSlider");
  const heightInput = document.getElementById("heightInput");
  const heightSlider = document.getElementById("heightSlider");
  const lockAspect = document.getElementById("lockAspect");
  const pxPresets = document.getElementById("pxPresets");
  const qualitySlider = document.getElementById("qualitySlider");
  const qualityVal = document.getElementById("qualityVal");

  const kbInput = document.getElementById("kbInput");
  const kbSlider = document.getElementById("kbSlider");
  const kbPresets = document.getElementById("kbPresets");
  const kbHint = document.getElementById("kbHint");

  const formatRow = document.getElementById("formatRow");
  const generateBtn = document.getElementById("generateBtn");
  const resultBox = document.getElementById("resultBox");
  const metaOutput = document.getElementById("metaOutput");
  const downloadBtn = document.getElementById("downloadBtn");

  const canvas = document.getElementById("workCanvas");
  const ctx = canvas.getContext("2d");

  // ---- Helpers ----
  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
  }
  function clearError() {
    errorBox.classList.add("hidden");
    errorBox.textContent = "";
  }
  function extForType(t) {
    return t === "image/jpeg" ? "jpg" : t === "image/webp" ? "webp" : "png";
  }
  function setControlsEnabled(enabled) {
    [
      widthInput, widthSlider, heightInput, heightSlider,
      kbInput, kbSlider, generateBtn
    ].forEach((el) => { el.disabled = !enabled; });
    document.querySelectorAll(".preset-btn").forEach((b) => { b.disabled = !enabled; });
    qualitySlider.disabled = !enabled || outputFormat === "image/png";
  }

  // ---- File loading ----
  function loadFile(file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
      showError("That's not an image file. Try a JPG, PNG, or WebP.");
      return;
    }
    clearError();

    const reader = new FileReader();
    reader.onerror = () => showError("Couldn't read that file. Try again.");
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const imgEl = new Image();
      imgEl.onload = () => {
        aspect = imgEl.width / imgEl.height;
        const startW = Math.min(512, imgEl.width);
        const startH = Math.max(1, Math.round(startW / aspect));

        image = {
          src: dataUrl,
          imgEl: imgEl,
          name: file.name || "image",
          origWidth: imgEl.width,
          origHeight: imgEl.height,
          origSizeKB: file.size / 1024,
        };

        previewImg.src = dataUrl;
        dropInner.classList.add("hidden");
        previewWrap.classList.remove("hidden");
        dropzone.classList.add("has-image");

        metaOrig.textContent = `${image.origWidth}×${image.origHeight}px · ${image.origSizeKB.toFixed(0)}KB`;
        metaRow.classList.remove("hidden");

        widthSlider.max = Math.max(imgEl.width * 2, 2048);
        heightSlider.max = Math.max(imgEl.height * 2, 2048);
        setValue(startW, startH);

        setControlsEnabled(true);
        resultBox.classList.add("hidden");
        if (outputURL) { URL.revokeObjectURL(outputURL); outputURL = null; }
      };
      imgEl.onerror = () => showError("Couldn't decode that image. Try a different file.");
      imgEl.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function setValue(w, h) {
    widthInput.value = w;
    widthSlider.value = w;
    heightInput.value = h;
    heightSlider.value = h;
  }

  // ---- Upload interactions ----
  browseBtn.addEventListener("click", () => fileInput.click());
  replaceBtn.addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    loadFile(file);
    e.target.value = "";
  });

  ["dragenter", "dragover"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-active");
    });
  });
  ["dragleave", "dragend"].forEach((evt) => {
    dropzone.addEventListener(evt, () => dropzone.classList.remove("drag-active"));
  });
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("drag-active");
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    loadFile(file);
  });

  // ---- Mode toggle ----
  modePxBtn.addEventListener("click", () => {
    mode = "px";
    modePxBtn.classList.add("mode-btn-active");
    modeKbBtn.classList.remove("mode-btn-active");
    pxControls.classList.remove("hidden");
    kbControls.classList.add("hidden");
  });
  modeKbBtn.addEventListener("click", () => {
    mode = "kb";
    modeKbBtn.classList.add("mode-btn-active");
    modePxBtn.classList.remove("mode-btn-active");
    kbControls.classList.remove("hidden");
    pxControls.classList.add("hidden");
    updateKbHint();
  });

  function updateKbHint() {
    kbHint.textContent = `Compression is auto-tuned to land close to your target at ${widthInput.value}×${heightInput.value}px. Switch to Dimensions to change output size.`;
  }

  // ---- Width / height sync ----
  function onWidthChange(v) {
    const w = Math.max(1, Math.round(Number(v) || 1));
    widthInput.value = w;
    widthSlider.value = w;
    if (lockAspect.checked) {
      const h = Math.max(1, Math.round(w / aspect));
      heightInput.value = h;
      heightSlider.value = h;
    }
    updateKbHint();
  }
  function onHeightChange(v) {
    const h = Math.max(1, Math.round(Number(v) || 1));
    heightInput.value = h;
    heightSlider.value = h;
    if (lockAspect.checked) {
      const w = Math.max(1, Math.round(h * aspect));
      widthInput.value = w;
      widthSlider.value = w;
    }
    updateKbHint();
  }

  widthInput.addEventListener("input", (e) => onWidthChange(e.target.value));
  widthSlider.addEventListener("input", (e) => onWidthChange(e.target.value));
  heightInput.addEventListener("input", (e) => onHeightChange(e.target.value));
  heightSlider.addEventListener("input", (e) => onHeightChange(e.target.value));

  pxPresets.addEventListener("click", (e) => {
    const btn = e.target.closest(".preset-btn");
    if (!btn || btn.disabled) return;
    onWidthChange(btn.dataset.preset);
  });

  qualitySlider.addEventListener("input", (e) => {
    qualityVal.textContent = Math.round(Number(e.target.value) * 100) + "%";
  });

  // ---- KB target ----
  function onKbChange(v) {
    const kb = Math.max(1, Math.round(Number(v) || 1));
    kbInput.value = kb;
    kbSlider.value = Math.min(kb, 5000);
  }
  kbInput.addEventListener("input", (e) => onKbChange(e.target.value));
  kbSlider.addEventListener("input", (e) => onKbChange(e.target.value));
  kbPresets.addEventListener("click", (e) => {
    const btn = e.target.closest(".preset-btn");
    if (!btn || btn.disabled) return;
    onKbChange(btn.dataset.preset);
  });

  // ---- Format ----
  formatRow.addEventListener("click", (e) => {
    const btn = e.target.closest(".format-btn");
    if (!btn) return;
    outputFormat = btn.dataset.format;
    document.querySelectorAll(".format-btn").forEach((b) => b.classList.remove("format-btn-active"));
    btn.classList.add("format-btn-active");
    qualitySlider.disabled = !image || outputFormat === "image/png";
  });

  // ---- Canvas rendering ----
  function drawToCanvas(w, h) {
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    if (outputFormat === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image.imgEl, 0, 0, w, h);
    return canvas;
  }

  function canvasToBlob(cnv, type, q) {
    return new Promise((resolve) => cnv.toBlob((b) => resolve(b), type, q));
  }

  async function generateByPixels(w, h) {
    const cnv = drawToCanvas(w, h);
    return await canvasToBlob(cnv, outputFormat, Number(qualitySlider.value));
  }

  async function generateByTargetSize(w, h, targetKB) {
    const cnv = drawToCanvas(w, h);
    const targetBytes = targetKB * 1024;

    if (outputFormat === "image/png") {
      return await canvasToBlob(cnv, "image/png", 1);
    }

    let lo = 0.02, hi = 1.0, best = null, bestDiff = Infinity;
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      const blob = await canvasToBlob(cnv, outputFormat, mid);
      const diff = Math.abs(blob.size - targetBytes);
      if (diff < bestDiff) { bestDiff = diff; best = blob; }
      if (blob.size > targetBytes) hi = mid; else lo = mid;
    }
    return best;
  }

  generateBtn.addEventListener("click", async () => {
    if (!image || isGenerating) return;
    isGenerating = true;
    clearError();
    generateBtn.textContent = "RENDERING…";
    generateBtn.disabled = true;

    try {
      const w = Number(widthInput.value);
      const h = Number(heightInput.value);
      const blob = mode === "px"
        ? await generateByPixels(w, h)
        : await generateByTargetSize(w, h, Number(kbInput.value));

      if (!blob) throw new Error("empty blob");

      if (outputURL) URL.revokeObjectURL(outputURL);
      outputURL = URL.createObjectURL(blob);

      const sizeKB = blob.size / 1024;
      metaOutput.textContent = `${w}×${h}px · ${sizeKB.toFixed(0)}KB`;
      const ext = extForType(outputFormat);
      const baseName = image.name.replace(/\.[^.]+$/, "");
      downloadBtn.href = outputURL;
      downloadBtn.download = `${baseName}-resized.${ext}`;
      downloadBtn.textContent = `⬇ DOWNLOAD ${ext.toUpperCase()}`;
      resultBox.classList.remove("hidden");
    } catch (err) {
      showError("Something went wrong generating the image. Try a smaller size.");
    } finally {
      isGenerating = false;
      generateBtn.textContent = "GENERATE IMAGE";
      generateBtn.disabled = false;
    }
  });

  // ---- Init ----
  setControlsEnabled(false);
})();
