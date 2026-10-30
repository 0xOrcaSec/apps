(() => {
  if (window.__johnPenDirectDrawInjected) return;
  window.__johnPenDirectDrawInjected = true;

  // Create full-screen transparent canvas on the browser page
  const canvas = document.createElement('canvas');
  canvas.id = 'mini-draw-overlay-canvas';
  document.documentElement.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Offscreen buffer to preserve drawings when browser window resizes
  const buffer = document.createElement('canvas');
  buffer.width = Math.max(window.screen.width, 2560);
  buffer.height = Math.max(window.screen.height, 1600);
  const bCtx = buffer.getContext('2d');

  function syncViewportCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.drawImage(buffer, 0, 0);
  }
  syncViewportCanvas();
  window.addEventListener('resize', syncViewportCanvas);

  // Create ultra-compact floating icon bar - HIDDEN BY DEFAULT ('hidden-bar')
  const bar = document.createElement('div');
  bar.id = 'mini-draw-floating-bar';
  bar.classList.add('hidden-bar'); // Never open automatically on page load!
  bar.innerHTML = `
    <span class="md-grip" id="md-drag-grip" title="اسحب لتحريك الأيقونات لأي مكان">⠿</span>

    <!-- Pen button (زرار القلم) -->
    <button class="md-icon-btn" id="md-btn-pen" title="قلم رسم (اضغط للتفعيل أو الإيقاف)">
      <svg viewBox="0 0 24 24">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      </svg>
    </button>

    <!-- Marker button (زرار الماركر) -->
    <button class="md-icon-btn" id="md-btn-marker" title="ماركر تظليل شفاف (اضغط للتفعيل أو الإيقاف)">
      <svg viewBox="0 0 24 24">
        <path d="m9 11-6 6v3h9l3-3"></path>
        <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"></path>
      </svg>
    </button>

    <!-- Clear All button (زرار مسح كله) -->
    <button class="md-icon-btn danger" id="md-btn-clear" title="مسح كل الرسومات">
      <svg viewBox="0 0 24 24">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    </button>

    <!-- Tiny color picker dot -->
    <label class="md-color-wrap" title="تغيير اللون">
      <input type="color" class="md-color-input" id="md-color" value="#ef4444">
    </label>

    <!-- Tiny icon size controls (+ / -) -->
    <div class="md-scale-group">
      <button class="md-mini-btn" id="md-size-down" title="تصغير حجم الأيقونات">−</button>
      <button class="md-mini-btn" id="md-size-up" title="تكبير حجم الأيقونات">+</button>
    </div>

    <!-- Close button (زر إغلاق الإضافة) -->
    <button class="md-icon-btn close-btn" id="md-btn-close" title="إغلاق شريط الأدوات">
      <svg viewBox="0 0 24 24">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
  document.documentElement.appendChild(bar);

  const btnPen = bar.querySelector('#md-btn-pen');
  const btnMarker = bar.querySelector('#md-btn-marker');
  const btnClear = bar.querySelector('#md-btn-clear');
  const btnClose = bar.querySelector('#md-btn-close');
  const colorInput = bar.querySelector('#md-color');
  const btnSizeDown = bar.querySelector('#md-size-down');
  const btnSizeUp = bar.querySelector('#md-size-up');
  const grip = bar.querySelector('#md-drag-grip');

  let activeTool = null; // null | 'pen' | 'marker'
  let iconSize = 28;
  let isDrawing = false;
  let points = [];

  // Load saved icon size & position
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['miniIconSize', 'miniBarLeft', 'miniBarTop'], (res) => {
      if (res.miniIconSize) {
        iconSize = res.miniIconSize;
        bar.style.setProperty('--icon-size', iconSize + 'px');
      }
      if (typeof res.miniBarLeft === 'number' && typeof res.miniBarTop === 'number') {
        bar.style.setProperty('right', 'auto', 'important');
        bar.style.setProperty('left', Math.min(window.innerWidth - 80, Math.max(4, res.miniBarLeft)) + 'px', 'important');
        bar.style.setProperty('top', Math.min(window.innerHeight - 40, Math.max(4, res.miniBarTop)) + 'px', 'important');
      }
    });
  }

  function updateToolUI() {
    btnPen.classList.toggle('active', activeTool === 'pen');
    btnMarker.classList.toggle('active-marker', activeTool === 'marker');
    if (activeTool) {
      canvas.classList.add('active-drawing');
    } else {
      canvas.classList.remove('active-drawing');
    }
  }

  function closeToolbar() {
    activeTool = null;
    updateToolUI();
    bar.classList.add('hidden-bar');
  }

  btnPen.addEventListener('click', () => {
    activeTool = activeTool === 'pen' ? null : 'pen';
    if (activeTool === 'pen' && colorInput.value === '#facc15') {
      colorInput.value = '#ef4444';
    }
    updateToolUI();
  });

  btnMarker.addEventListener('click', () => {
    activeTool = activeTool === 'marker' ? null : 'marker';
    if (activeTool === 'marker' && colorInput.value === '#ef4444') {
      colorInput.value = '#facc15';
    }
    updateToolUI();
  });

  btnClear.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bCtx.clearRect(0, 0, buffer.width, buffer.height);
  });

  // Close button handler
  btnClose.addEventListener('click', () => {
    closeToolbar();
  });

  function setIconSize(newSize) {
    iconSize = Math.min(44, Math.max(20, newSize));
    bar.style.setProperty('--icon-size', iconSize + 'px');
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ miniIconSize: iconSize });
    }
  }

  btnSizeDown.addEventListener('click', () => setIconSize(iconSize - 3));
  btnSizeUp.addEventListener('click', () => setIconSize(iconSize + 3));

  // Dragging the tiny bar anywhere on screen
  let draggingBar = false;
  let offsetX = 0, offsetY = 0;

  grip.addEventListener('pointerdown', (e) => {
    draggingBar = true;
    const rect = bar.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    grip.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  grip.addEventListener('pointermove', (e) => {
    if (!draggingBar) return;
    const newLeft = Math.min(window.innerWidth - bar.offsetWidth - 4, Math.max(4, e.clientX - offsetX));
    const newTop = Math.min(window.innerHeight - bar.offsetHeight - 4, Math.max(4, e.clientY - offsetY));
    bar.style.setProperty('right', 'auto', 'important');
    bar.style.setProperty('left', newLeft + 'px', 'important');
    bar.style.setProperty('top', newTop + 'px', 'important');
  });

  grip.addEventListener('pointerup', (e) => {
    if (!draggingBar) return;
    draggingBar = false;
    grip.releasePointerCapture(e.pointerId);
    const rect = bar.getBoundingClientRect();
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ miniBarLeft: rect.left, miniBarTop: rect.top });
    }
  });

  // Drawing on the browser overlay canvas
  function drawStroke(targetCtx, pts) {
    if (!pts.length) return;
    targetCtx.save();
    targetCtx.strokeStyle = colorInput.value;
    targetCtx.fillStyle = colorInput.value;

    if (activeTool === 'marker') {
      targetCtx.globalAlpha = 0.35;
      targetCtx.lineWidth = 22;
      targetCtx.lineCap = 'square';
      targetCtx.lineJoin = 'round';
    } else {
      targetCtx.globalAlpha = 1.0;
      targetCtx.lineWidth = 3.5;
      targetCtx.lineCap = 'round';
      targetCtx.lineJoin = 'round';
    }

    targetCtx.beginPath();
    if (pts.length === 1) {
      targetCtx.arc(pts[0].x, pts[0].y, targetCtx.lineWidth / 2, 0, Math.PI * 2);
      targetCtx.fill();
    } else {
      targetCtx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const midX = (pts[i - 1].x + pts[i].x) / 2;
        const midY = (pts[i - 1].y + pts[i].y) / 2;
        targetCtx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
      }
      targetCtx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      targetCtx.stroke();
    }
    targetCtx.restore();
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!activeTool) return;
    isDrawing = true;
    points = [{ x: e.clientX, y: e.clientY }];
    canvas.setPointerCapture(e.pointerId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(buffer, 0, 0);
    drawStroke(ctx, points);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDrawing || !activeTool) return;
    points.push({ x: e.clientX, y: e.clientY });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(buffer, 0, 0);
    drawStroke(ctx, points);
  });

  function finishStroke() {
    if (!isDrawing) return;
    isDrawing = false;
    drawStroke(bCtx, points);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(buffer, 0, 0);
    points = [];
  }

  canvas.addEventListener('pointerup', finishStroke);
  canvas.addEventListener('pointercancel', finishStroke);

  // Escape key turns off active drawing tool
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeTool) {
      activeTool = null;
      updateToolUI();
    }
  });

  // Toggle bar visibility ONLY when clicking JohnPen icon in Chrome toolbar
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.action === 'TOGGLE_MINI_TOOLS') {
      if (bar.classList.contains('hidden-bar')) {
        bar.classList.remove('hidden-bar');
      } else {
        closeToolbar();
      }
      sendResponse({ ok: true });
    }
  });
})();
