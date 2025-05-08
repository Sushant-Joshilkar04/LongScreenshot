(async function () {
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  const dpr = window.devicePixelRatio;

  function getScrollParent(el) {
    let parent = el;
    while (parent && parent !== document.body) {
      const style = getComputedStyle(parent);
      if (/(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return window;
  }

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.15)",
    zIndex: 999999,
    cursor: "crosshair"
  });
  document.body.appendChild(overlay);

  const instructions = document.createElement("div");
  Object.assign(instructions.style, {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "white",
    padding: "10px 20px",
    borderRadius: "5px",
    fontFamily: "system-ui, sans-serif",
    fontSize: "14px",
    zIndex: 1000001,
    pointerEvents: "none"
  });
  instructions.textContent = "Click where you want to start and drag to where you want to end";
  document.body.appendChild(instructions);

  let startX, startY;
  let scrollContainer;
  let selectionBox;
  let autoScrollInterval = null;
  const scrollSpeed = 20;
  const scrollMargin = 50;

  overlay.addEventListener("mousedown", (e) => {
    startX = e.clientX;
    startY = e.clientY + window.scrollY;
    selectionBox = document.createElement("div");

    const clicked = document.elementFromPoint(e.clientX, e.clientY);
    scrollContainer = getScrollParent(clicked);

    Object.assign(selectionBox.style, {
      position: "absolute",
      border: "2px dashed red",
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      zIndex: 1000000,
      left: `${startX}px`,
      top: `${startY}px`,
      width: "0px",
      height: "0px"
    });
    document.body.appendChild(selectionBox);

    const onMouseMove = (e) => {
      const curX = e.clientX;
      const curY = e.clientY + window.scrollY;
      const minX = Math.min(curX, startX);
      const minY = Math.min(curY, startY);
      const width = Math.abs(curX - startX);
      const height = Math.abs(curY - startY);

      Object.assign(selectionBox.style, {
        left: `${minX}px`,
        top: `${minY}px`,
        width: `${width}px`,
        height: `${height}px`
      });

      clearInterval(autoScrollInterval);
      const localY = e.clientY;

      if (localY > window.innerHeight - scrollMargin) {
        autoScrollInterval = setInterval(() => {
          if (scrollContainer === window) {
            window.scrollBy(0, scrollSpeed);
          } else {
            scrollContainer.scrollTop += scrollSpeed;
          }
        }, 10);
      } else if (localY < scrollMargin) {
        autoScrollInterval = setInterval(() => {
          if (scrollContainer === window) {
            window.scrollBy(0, -scrollSpeed);
          } else {
            scrollContainer.scrollTop -= scrollSpeed;
          }
        }, 10);
      }
    };

    const onMouseUp = async (e) => {
      clearInterval(autoScrollInterval);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      overlay.remove();
      instructions.remove();

      const endX = e.clientX;
      const endY = e.clientY + window.scrollY;
      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);
      const selection = { x: left * dpr, y: top * dpr, width: width * dpr, height: height * dpr };
      selectionBox.remove();

      // Hide sticky/fixed elements
      const stickyEls = [];
      document.querySelectorAll('*').forEach(el => {
        const style = getComputedStyle(el);
        if (style.position === 'sticky' || style.position === 'fixed') {
          stickyEls.push({ el, original: el.style.visibility });
          el.style.visibility = 'hidden';
        }
      });

      // Loading indicator
      const loadingIndicator = document.createElement("div");
      Object.assign(loadingIndicator.style, {
        position: "fixed", bottom: "20px", right: "20px",
        backgroundColor: "rgba(0,0,0,0.8)", color: "white",
        padding: "10px 15px", borderRadius: "8px",
        fontFamily: "system-ui, sans-serif", fontSize: "14px",
        zIndex: 1000001, minWidth: "150px", textAlign: "center"
      });
      loadingIndicator.textContent = "Preparing...";
      const toggleIndicator = (vis) => vis ? document.body.appendChild(loadingIndicator) : loadingIndicator.remove();
      toggleIndicator(true);

      // Capture loop using container scroll
      const screenshots = [];
      const viewH = scrollContainer === window ? window.innerHeight : scrollContainer.clientHeight;
      const captureEnd = Math.ceil((selection.y + selection.height) / dpr);
      let pos = 0, count = 0;
      const origScroll = scrollContainer === window ? window.scrollY : scrollContainer.scrollTop;

      while (pos < captureEnd) {
        loadingIndicator.textContent = `Capturing (${++count})`;
        if (scrollContainer === window) window.scrollTo(0, pos);
        else scrollContainer.scrollTop = pos;
        await delay(300);
        toggleIndicator(false);
        await delay(100);
        const dataUrl = await new Promise(res => chrome.runtime.sendMessage({ action: "capture" }, r => res(r.dataUrl)));
        toggleIndicator(true);
        loadingIndicator.textContent = `Processing (${count})`;
        screenshots.push({ y: pos * dpr, dataUrl });
        pos += viewH;
      }

      // Restore main scroll
      if (scrollContainer === window) window.scrollTo(0, origScroll);
      else scrollContainer.scrollTop = origScroll;

      // Stitch images
      const imgs = await Promise.all(screenshots.map(s => new Promise(res => {
        const img = new Image(); img.onload = () => res({ ...s, img }); img.src = s.dataUrl;
      })));
      const canvas = document.createElement("canvas");
      canvas.width = selection.width; canvas.height = selection.height;
      const ctx = canvas.getContext("2d");
      imgs.sort((a, b) => a.y - b.y);
      const fill = Array(canvas.height).fill(false);
      imgs.forEach(({ img, y }) => {
        const start = y, end = y + img.height;
        for (let py = 0; py < canvas.height; py++) {
          if (!fill[py]) {
            const docY = selection.y + py;
            if (docY >= start && docY < end) {
              const sy = docY - start;
              if (sy < img.height) {
                ctx.drawImage(img, selection.x, sy, selection.width, 1, 0, py, selection.width, 1);
                fill[py] = true;
              }
            }
          }
        }
      });

      // Finalize
      toggleIndicator(false);
      stickyEls.forEach(({ el, original }) => el.style.visibility = original);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `screenshot-${new Date().toISOString().replace(/:/g,'-').replace(/\..+/,'')}.png`;
      link.click();
      setTimeout(() => {
        const msg = document.createElement("div");
        Object.assign(msg.style, { position: "fixed", bottom: "20px", right: "20px", backgroundColor: "rgba(0,128,0,0.8)", color: "white", padding: "10px 15px", borderRadius: "8px", fontFamily: "system-ui, sans-serif", fontSize: "14px", zIndex: 1000001 });
        msg.textContent = "✅ Screenshot saved!";
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 2000);
      }, 500);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
})();
