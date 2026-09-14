/* =========================================================================
   Lattice Background — vanilla JS port (blue & white)
   Renders an animated triangulated lattice with cursor-field deformation
   into any element that has a <canvas data-lattice> child.
   ========================================================================= */
(function () {
  'use strict';

  var container = document.querySelector('[data-lattice-host]');
  var canvas = container && container.querySelector('[data-lattice]');
  if (!canvas) return;

  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- palette: blue on white ------------------------------------------ */
  var BG = '#f7fbfa';            // canvas ground (matches --bg)
  var LINE_RGB = '82, 132, 126';  // muted teal mesh
  var ACCENT_RGB = '17, 94, 89';  // dark teal near the cursor

  var MAX_DIST = 140;
  var MAX_DIST_SQ = MAX_DIST * MAX_DIST;
  var CURSOR_R = 220;
  var CURSOR_R_SQ = CURSOR_R * CURSOR_R;
  var REPEL_R = 200;
  var REPEL_R_SQ = REPEL_R * REPEL_R;

  var width = 0, height = 0;
  var points = [];
  var mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 };
  var rafId = null;
  var lastTime = performance.now();

  function initPoints(w, h) {
    points = [];
    var density = Math.floor((w * h) / 11000);
    var count = Math.min(Math.max(density, 40), window.innerWidth < 700 ? 55 : 105);

    for (var i = 0; i < count; i++) {
      points.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 1 + Math.random() * 1.5
      });
    }
  }

  function handleResize() {
    var w = container.clientWidth || window.innerWidth;
    var h = container.clientHeight || window.innerHeight;
    if (!w || !h) return;
    // ignore mobile-browser chrome collapsing (height-only jitter under 120px)
    if (points.length && w === width && Math.abs(h - height) < 120) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = w;
    height = h;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initPoints(width, height);
  }

  // The host is fixed at the viewport origin, so client coords map 1:1.
  function handleMouseMove(e) {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
  }

  function handleMouseLeave() {
    mouse.targetX = -1000;
    mouse.targetY = -1000;
  }

  function render(now) {
    var dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;

    // smooth cursor lerp
    mouse.x += (mouse.targetX - mouse.x) * 0.1;
    mouse.y += (mouse.targetY - mouse.y) * 0.1;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, width, height);

    var pCount = points.length;
    var i, j, k, c, r;

    /* --- 1. particle physics ------------------------------------------- */
    for (i = 0; i < pCount; i++) {
      var p = points[i];
      p.pulse += dt * p.pulseSpeed;

      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;

      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      else if (p.x > width) { p.x = width; p.vx *= -1; }

      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      else if (p.y > height) { p.y = height; p.vy *= -1; }

      var dx = mouse.x - p.x;
      var dy = mouse.y - p.y;
      var distSq = dx * dx + dy * dy;

      if (distSq < REPEL_R_SQ && distSq > 0) {
        var dist = Math.sqrt(distSq);
        var force = (1 - dist / REPEL_R) * 35;
        p.x -= (dx / dist) * force * dt * 6;
        p.y -= (dy / dist) * force * dt * 6;
      }
    }

    /* --- 2. spatial grid partitioning ----------------------------------- */
    var cols = Math.max(1, Math.ceil(width / MAX_DIST));
    var rows = Math.max(1, Math.ceil(height / MAX_DIST));
    var grid = new Array(cols);
    for (c = 0; c < cols; c++) {
      grid[c] = new Array(rows);
      for (r = 0; r < rows; r++) grid[c][r] = [];
    }

    for (i = 0; i < pCount; i++) {
      var gc = Math.min(cols - 1, Math.max(0, Math.floor(points[i].x / MAX_DIST)));
      var gr = Math.min(rows - 1, Math.max(0, Math.floor(points[i].y / MAX_DIST)));
      grid[gc][gr].push(i);
    }

    /* --- 3. triangulated mesh ------------------------------------------- */
    for (c = 0; c < cols; c++) {
      for (r = 0; r < rows; r++) {
        var cellPoints = grid[c][r];
        if (!cellPoints.length) continue;

        var neighbors = [];
        for (var nc = Math.max(0, c - 1); nc <= Math.min(cols - 1, c + 1); nc++) {
          for (var nr = Math.max(0, r - 1); nr <= Math.min(rows - 1, r + 1); nr++) {
            var nList = grid[nc][nr];
            for (k = 0; k < nList.length; k++) neighbors.push(nList[k]);
          }
        }
        var nCount = neighbors.length;

        for (i = 0; i < cellPoints.length; i++) {
          var idx1 = cellPoints[i];
          var p1 = points[idx1];

          for (j = 0; j < nCount; j++) {
            var idx2 = neighbors[j];
            if (idx1 >= idx2) continue;
            var p2 = points[idx2];

            var dx12 = p1.x - p2.x, dy12 = p1.y - p2.y;
            if (dx12 * dx12 + dy12 * dy12 > MAX_DIST_SQ) continue;

            for (k = j + 1; k < nCount; k++) {
              var idx3 = neighbors[k];
              if (idx2 >= idx3) continue;
              var p3 = points[idx3];

              var dx23 = p2.x - p3.x, dy23 = p2.y - p3.y;
              if (dx23 * dx23 + dy23 * dy23 > MAX_DIST_SQ) continue;

              var dx31 = p3.x - p1.x, dy31 = p3.y - p1.y;
              if (dx31 * dx31 + dy31 * dy31 > MAX_DIST_SQ) continue;

              var avgX = (p1.x + p2.x + p3.x) * 0.3333;
              var avgY = (p1.y + p2.y + p3.y) * 0.3333;
              var mDx = mouse.x - avgX, mDy = mouse.y - avgY;
              var mouseDistSq = mDx * mDx + mDy * mDy;
              var isNearMouse = mouseDistSq < CURSOR_R_SQ;

              var fillAlpha = isNearMouse
                ? (1 - Math.sqrt(mouseDistSq) / CURSOR_R) * 0.17
                : 0.035;

              ctx.fillStyle = isNearMouse
                ? 'rgba(' + ACCENT_RGB + ',' + fillAlpha.toFixed(3) + ')'
                : 'rgba(' + LINE_RGB + ',' + fillAlpha.toFixed(3) + ')';

              ctx.strokeStyle = isNearMouse
                ? 'rgba(' + ACCENT_RGB + ',' + (fillAlpha * 1.6).toFixed(3) + ')'
                : 'rgba(' + LINE_RGB + ',0.13)';
              ctx.lineWidth = isNearMouse ? 0.9 : 0.5;

              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.lineTo(p3.x, p3.y);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
          }
        }
      }
    }

    /* --- 4. nodes + pulse rings ----------------------------------------- */
    for (i = 0; i < pCount; i++) {
      var q = points[i];
      var qDx = mouse.x - q.x, qDy = mouse.y - q.y;
      var isNear = qDx * qDx + qDy * qDy < CURSOR_R_SQ;
      var pulseRadius = 1.7 + Math.sin(q.pulse) * 0.9;

      ctx.fillStyle = isNear
        ? 'rgba(' + ACCENT_RGB + ',0.85)'
        : 'rgba(' + LINE_RGB + ',0.45)';

      ctx.beginPath();
      ctx.arc(q.x, q.y, isNear ? 3.2 : pulseRadius, 0, Math.PI * 2);
      ctx.fill();

      if (isNear) {
        ctx.strokeStyle = 'rgba(' + ACCENT_RGB + ',0.3)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 7 + Math.sin(q.pulse * 2) * 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    rafId = requestAnimationFrame(render);
  }

  /* ---- boot ------------------------------------------------------------ */
  handleResize();

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(handleResize).observe(container);
  } else {
    window.addEventListener('resize', handleResize);
  }

  if (reduceMotion) {
    render(performance.now());          // one static frame, then stop
    cancelAnimationFrame(rafId);
  } else {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('blur', handleMouseLeave);

    rafId = requestAnimationFrame(render);

    // pause while the tab is hidden so we don't burn CPU in the background
    var running = true;
    function pause() { if (running) { cancelAnimationFrame(rafId); running = false; } }
    function resume() {
      if (!running) { running = true; lastTime = performance.now(); rafId = requestAnimationFrame(render); }
    }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? pause() : resume();
    });
  }
})();
