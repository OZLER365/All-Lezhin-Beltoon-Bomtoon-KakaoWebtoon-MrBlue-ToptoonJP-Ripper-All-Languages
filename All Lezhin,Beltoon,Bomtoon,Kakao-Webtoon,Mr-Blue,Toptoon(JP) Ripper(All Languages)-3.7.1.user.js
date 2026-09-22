// ==UserScript==
// @name         All Lezhin,Beltoon,Bomtoon,Kakao-Webtoon,Mr-Blue,Toptoon(JP) Ripper(All Languages)
// @namespace    http://tampermonkey.net/
// @version      3.7.1
// @license      All Rights Reserved
// @description  Fetches Images through Blob Hook, No Canvas Descrambling Needed, Used DOM for Page Ordering
// @icon         https://play-lh.googleusercontent.com/5j1P3NokKSTW5dZUWN8V7dYfjUSYkaSObLyF8h3nXIQKZr8pkMfJELLymQc9ATELPva4mJsnWFOIVvnoe0_DlQ
// @match        *://*.lezhinus.com/*
// @match        *://*.lezhin.com/*
// @match        *://*.lezhin.es/*
// @match        *://*.lezhin.jp/*
// @match        *://*.beltoon.jp/*
// @match        *://*.lezhinfr.com/*
// @match        *://*.lezhinde.com/*
// @match        *://*.bomtoon.tw/*
// @match        *://*.bomtoon.com/*
// @match        *://*.lezhinth.com/*
// @match        *://webtoon.kakao.com/*
// @match        *://*.toptoon.jp/*
// @match        *://viewer.mrblue.com/*
// @match        *://*.mrblue.com/*
// @run-at       document-start
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @downloadURL https://update.greasyfork.org/scripts/563063/All%20Lezhin%2CBeltoon%2CBomtoon%2CKakao-Webtoon%2CMr-Blue%2CToptoon%28JP%29%20Ripper%28All%20Languages%29.user.js
// @updateURL https://update.greasyfork.org/scripts/563063/All%20Lezhin%2CBeltoon%2CBomtoon%2CKakao-Webtoon%2CMr-Blue%2CToptoon%28JP%29%20Ripper%28All%20Languages%29.meta.js
// ==/UserScript==

/* 
 * Copyright (c) 2026-27 ozler. All Rights Reserved.
 * 
 * STRICT LICENSE:
 * 1. No Copying or Redistribution: You may not host, distribute, or copy this script 
 *    without explicit permission.
 * 2. No Derivatives Without Permission: If you wish to rework this script, add features, 
 *    or use the core auto-scrolling/blob-fetching methods developed here in your own 
 *    project, you MUST contact the author to request explicit written permission first.
 * 3. Mandatory Credit: Any approved modifications or derivations must visibly credit 
 *    the original author.
 */
 
(function() {
    'use strict';

    // Bridge for cross-origin local storage of Auto-DL toggle
    const initialAutoDl = GM_getValue('wt_auto_dl_state', false);
    document.addEventListener('GM_Toggle_AutoDL', (e) => {
        GM_setValue('wt_auto_dl_state', e.detail);
    });

    // -------------------------------------------------------------------------
    // 1. GREASEMONKEY CONTEXT: Queue, SHA-256 Hashing, Format Conversion, Batching
    // -------------------------------------------------------------------------

    let stats = { processed: 0, total: 0, duplicates: 0 };
    let seenHashes = new Set();
    let currentFolder = 'Webtoon';
    let batchDownloads = []; 

    function updateProgressUI() {
        document.dispatchEvent(new CustomEvent('GM_Update_Progress', { detail: stats }));
    }

    async function getSha256(buffer) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function convertToStandardFormat(buffer, mime) {
        return new Promise((resolve, reject) => {
            const blob = new Blob([buffer], { type: mime });
            const url = URL.createObjectURL(blob);
            const img = document.createElement('img');

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');

                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);

                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL('image/jpeg', 0.98));
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    document.addEventListener('GM_Start_Batch', (e) => {
        const data = e.detail;
        let safeFolder = data.folderName.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '').trim();
        currentFolder = safeFolder || 'Webtoon_Chapter';

        stats = { processed: 0, total: data.total, duplicates: 0 };
        seenHashes.clear();
        batchDownloads = []; 
        updateProgressUI();
    });

    document.addEventListener('GM_Process_Item', async (e) => {
        const item = e.detail;

        const finalizeItem = () => {
            stats.processed++;
            updateProgressUI();

            if (stats.processed === stats.total) {
                batchDownloads.forEach(dl => {
                    GM_download({
                        url: dl.url, name: dl.name, saveAs: false
                    });
                });
            }
        };

        try {
            let buffer, mime, ext, downloadUrl;

            if (item.type === 'blobDataUrl') {
                const split = item.url.split(',');
                mime = split[0].match(/:(.*?);/)[1] || 'image/jpeg';
                const binaryStr = atob(split[1]);
                buffer = new ArrayBuffer(binaryStr.length);
                const view = new Uint8Array(buffer);
                for (let i = 0; i < binaryStr.length; i++) view[i] = binaryStr.charCodeAt(i);
                downloadUrl = item.url;
            }
            else if (item.type === 'httpUrl') {
                const res = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({ method: 'GET', url: item.url, responseType: 'arraybuffer', onload: resolve, onerror: reject });
                });
                buffer = res.response;
                const contentTypeHeader = res.responseHeaders.match(/content-type:\s*(image\/[^\s\r\n]+)/i);
                mime = contentTypeHeader ? contentTypeHeader[1] : 'image/webp';
                downloadUrl = await new Promise((resolve) => {
                    const blob = new Blob([buffer], { type: mime });
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }

            const hashStr = await getSha256(buffer);
            if (seenHashes.has(hashStr)) {
                stats.duplicates++;
                finalizeItem();
                return;
            }
            seenHashes.add(hashStr);

            try {
                downloadUrl = await convertToStandardFormat(buffer, mime);
                ext = 'jpg';
            } catch (convErr) {
                console.error('Format conversion failed, falling back to original', convErr);
                if (mime.includes('png')) ext = 'png';
                else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
                else if (mime.includes('gif')) ext = 'gif';
                else ext = 'webp';
            }

            const filename = `${currentFolder}/img_${String(item.index).padStart(3, '0')}.${ext}`;

            batchDownloads.push({ url: downloadUrl, name: filename });
            finalizeItem();

        } catch (err) {
            console.error('Failed to process item:', item.url, err);
            finalizeItem();
        }
    });

    // -------------------------------------------------------------------------
    // 2. PAGE CONTEXT INJECTION: Isolated Ordering, Smart Scroll, Anti-Wipe UI
    // -------------------------------------------------------------------------

    const pageScript = function() {
        window.__capturedBlobs = new Map();

        const explicitMemoryMap = new Map();
        const persistentMemoryQueue = new Map();
        const orderedDomUrls = [];

        let isDownloading = false;
        let isScrolling = false;
        let autoDownloadEnabled = window.__wt_init_auto_dl === true;
        let autoScrollInterval = null;
        let stallTimer = 0;
        let currentUrlPath = window.location.href.split('#')[0];
        
        let lastCaptureTime = Date.now();
        let lastCapturedCount = 0;
        let hasTriggeredAutoDlForCurrentCapture = false;
        
        let lastDownloadTitle = "";
        let sameTitleCount = 0;

        let uiDlTextStr = 'Download (0)';

        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        const originalCreateObjectURL = URL.createObjectURL;
        URL.createObjectURL = function(obj) {
            const url = originalCreateObjectURL.apply(this, arguments);
            if (obj instanceof Blob) window.__capturedBlobs.set(url, obj);
            return url;
        };

        const isValidTarget = (url) => {
            if (!url) return false;
            if (url.startsWith('blob:')) return true;
            if (url.includes('rcdn')) return true;
            if (url.includes('ccdn')) return true; 
            return false;
        };

        const extractImageIndex = (el) => {
            const hostname = window.location.hostname;
            if (hostname.includes('lezhinus.com') || hostname.includes('lezhin.com') || hostname.includes('webtoon.kakao.com')) {
                const attrs = ['data-index', 'data-scroll-index', 'data-cut-index', 'data-page'];
                for (const attr of attrs) {
                    const indexedEl = el.closest(`[${attr}]`);
                    if (indexedEl) return parseInt(indexedEl.getAttribute(attr), 10);
                    if (el.getAttribute(attr) !== null) return parseInt(el.getAttribute(attr), 10);
                }
                const idEl = el.closest('[id*="scroll-list-item"]');
                if (idEl) {
                    const match = idEl.id.match(/\d+/);
                    if (match) return parseInt(match[0], 10);
                }
            }
            if (hostname.includes('lezhin.jp')) {
                const alt = el.getAttribute('alt');
                if (alt) {
                    const match = alt.match(/page_(\d+)/i);
                    if (match) return parseInt(match[1], 10);
                }
            }
            return null;
        };

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const panel = document.getElementById('wt-control-panel');
                if (panel) {
                    panel.style.right = 'auto';
                    panel.style.left = (e.clientX - dragOffsetX) + 'px';
                    panel.style.top = (e.clientY - dragOffsetY) + 'px';
                }
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                const header = document.getElementById('wt-header-drag');
                if (header) header.style.cursor = 'grab';
                const panel = document.getElementById('wt-control-panel');
                if (panel) panel.style.transition = 'all 0.3s ease';
            }
        });

        const buildUI = () => {
            if (document.getElementById('wt-control-panel')) return; 
            if (!document.body) return; 

            const panel = document.createElement('div');
            panel.id = 'wt-control-panel';
            panel.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 2147483647;
                display: flex; flex-direction: column; gap: 10px;
                font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background: rgba(20, 20, 22, 0.85); padding: 16px; border-radius: 14px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
                width: 230px; box-sizing: border-box; transition: all 0.3s ease;
            `;

            const header = document.createElement('div');
            header.id = 'wt-header-drag';
            header.style.cssText = `
                display: flex; justify-content: space-between; align-items: center;
                cursor: grab; user-select: none; margin-bottom: 2px; width: 100%;
            `;

            const title = document.createElement('div');
            title.style.cssText = `
                color: #fff; font-size: 12px; font-weight: 700; text-align: center;
                text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.7;
            `;
            title.textContent = 'Webtoon Engine';

            const minBtn = document.createElement('button');
            minBtn.textContent = '—';
            minBtn.style.cssText = `
                background: none; border: none; color: #fff; cursor: pointer;
                opacity: 0.7; font-weight: bold; font-size: 14px; padding: 0 5px; margin: 0; outline: none;
            `;

            header.appendChild(title);
            header.appendChild(minBtn);
            panel.appendChild(header);

            const contentWrapper = document.createElement('div');
            contentWrapper.style.cssText = `display: flex; flex-direction: column; gap: 10px; width: 100%;`;
            panel.appendChild(contentWrapper);

            minBtn.addEventListener('click', () => {
                if (contentWrapper.style.display === 'none') {
                    contentWrapper.style.display = 'flex';
                    minBtn.textContent = '—';
                } else {
                    contentWrapper.style.display = 'none';
                    minBtn.textContent = '＋';
                }
            });

            header.addEventListener('mousedown', (e) => {
                if (e.target === minBtn) return;
                isDragging = true;
                header.style.cursor = 'grabbing';
                const rect = panel.getBoundingClientRect();
                dragOffsetX = e.clientX - rect.left;
                dragOffsetY = e.clientY - rect.top;
                panel.style.transition = 'none';
            });

            const btn = document.createElement('button');
            btn.id = 'wt-btn-dl';
            btn.style.cssText = `
                background: linear-gradient(135deg, #ff4081 0%, #d81b60 100%);
                color: white; border: none; padding: 12px; border-radius: 8px;
                font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(255, 64, 129, 0.3); width: 100%;
                display: flex; justify-content: center; align-items: center; gap: 8px;
            `;
            btn.innerHTML = `<span style="font-size:16px">📥</span> <span id="wt-dl-text">${uiDlTextStr}</span>`;
            contentWrapper.appendChild(btn);

            btn.onmouseover = () => { if(!isDownloading) btn.style.transform = 'translateY(-2px)'; };
            btn.onmouseout = () => { if(!isDownloading) btn.style.transform = 'translateY(0)'; };

            const btnGroup = document.createElement('div');
            btnGroup.style.cssText = `display: flex; gap: 8px; width: 100%;`;
            contentWrapper.appendChild(btnGroup);

            const scrollBtn = document.createElement('button');
            scrollBtn.id = 'wt-btn-scroll';
            scrollBtn.style.cssText = `
                background: rgba(255, 255, 255, 0.1); color: #fff;
                border: 1px solid rgba(255,255,255,0.15); padding: 10px 0; border-radius: 8px;
                font-weight: 600; font-size: 12px; cursor: pointer; transition: all 0.2s ease;
                flex: 1; display: flex; justify-content: center; align-items: center; gap: 5px;
            `;
            scrollBtn.innerHTML = `⏬ Scroll`;
            btnGroup.appendChild(scrollBtn);

            scrollBtn.onmouseover = () => { if(!isScrolling) scrollBtn.style.background = 'rgba(255, 255, 255, 0.2)'; };
            scrollBtn.onmouseout = () => { if(!isScrolling) scrollBtn.style.background = 'rgba(255, 255, 255, 0.1)'; };

            const toggleBtn = document.createElement('button');
            toggleBtn.style.cssText = `
                background: rgba(255, 255, 255, 0.1); color: #fff;
                border: 1px solid rgba(255,255,255,0.15); padding: 10px 0; border-radius: 8px;
                font-weight: 600; font-size: 12px; cursor: pointer; transition: all 0.2s ease;
                flex: 1; display: flex; justify-content: center; align-items: center; gap: 5px;
            `;
            toggleBtn.innerHTML = `☐ Auto-DL`;
            btnGroup.appendChild(toggleBtn);

            if (isScrolling) {
                scrollBtn.innerHTML = '⏹ Stop';
                scrollBtn.style.background = 'rgba(244, 67, 54, 0.2)';
                scrollBtn.style.color = '#f44336'; scrollBtn.style.borderColor = '#f44336';
            }
            if (autoDownloadEnabled) {
                toggleBtn.innerHTML = `☑ Auto-DL`;
                toggleBtn.style.background = 'rgba(76, 175, 80, 0.2)';
                toggleBtn.style.borderColor = '#4caf50'; toggleBtn.style.color = '#4caf50';
            }

            toggleBtn.addEventListener('click', () => {
                autoDownloadEnabled = !autoDownloadEnabled;
                document.dispatchEvent(new CustomEvent('GM_Toggle_AutoDL', { detail: autoDownloadEnabled }));
                
                if (autoDownloadEnabled) {
                    toggleBtn.innerHTML = `☑ Auto-DL`;
                    toggleBtn.style.background = 'rgba(76, 175, 80, 0.2)';
                    toggleBtn.style.borderColor = '#4caf50'; toggleBtn.style.color = '#4caf50';
                } else {
                    toggleBtn.innerHTML = `☐ Auto-DL`;
                    toggleBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                    toggleBtn.style.borderColor = 'rgba(255,255,255,0.15)'; toggleBtn.style.color = '#fff';
                }
            });

            scrollBtn.addEventListener('click', () => {
                if (isScrolling) {
                    clearInterval(autoScrollInterval);
                    isScrolling = false;
                    scrollBtn.innerHTML = '⏬ Scroll';
                    scrollBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                    scrollBtn.style.color = '#fff'; scrollBtn.style.borderColor = 'rgba(255,255,255,0.15)';
                    return;
                }

                hasTriggeredAutoDlForCurrentCapture = false;
                lastCaptureTime = Date.now();

                isScrolling = true;
                scrollBtn.innerHTML = '⏹ Stop';
                scrollBtn.style.background = 'rgba(244, 67, 54, 0.2)';
                scrollBtn.style.color = '#f44336'; scrollBtn.style.borderColor = '#f44336';
                stallTimer = 0;

                const hostname = window.location.hostname;
                const isLezhinJP = hostname.includes('lezhin.jp');
                const isLezhinLazy = hostname.includes('lezhinus.com') || hostname.includes('lezhin.com');
                const jpContainer = isLezhinJP ? document.querySelector('.no-scrollbar-viewer') : null;

                if (isLezhinJP && jpContainer) {
                    jpContainer.scrollTo(0, 0);
                } else {
                    window.scrollTo(0, 0);
                }

                setTimeout(() => {
                    autoScrollInterval = setInterval(() => {
                        const performNormalJump = () => {
                            if (isLezhinJP && jpContainer) {
                                jpContainer.scrollBy(0, jpContainer.clientHeight * 0.85);
                            } else {
                                window.scrollBy(0, window.innerHeight * 0.85);
                            }
                        };

                        if (isNextImageLoading(isLezhinJP, jpContainer)) {
                            if (isLezhinJP) {
                                stallTimer += 300;
                                if (stallTimer > 1500) {
                                    stallTimer = 0; performNormalJump();
                                }
                            } else if (isLezhinLazy) {
                                stallTimer += 300;
                                if (stallTimer > 15000) { 
                                    stallTimer = 0; performNormalJump();
                                }
                            } else {
                                stallTimer += 300;
                                if (stallTimer > 15000) { 
                                    stallTimer = 0; performNormalJump();
                                }
                            }
                        } else {
                            stallTimer = 0; 
                            performNormalJump();
                        }

                        if (checkBottomReached(hostname, isLezhinJP, jpContainer)) {
                            clearInterval(autoScrollInterval);
                            isScrolling = false;

                            const sBtn = document.getElementById('wt-btn-scroll');
                            if (sBtn) {
                                sBtn.innerHTML = '⏬ Scroll';
                                sBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                                sBtn.style.color = '#fff'; sBtn.style.borderColor = 'rgba(255,255,255,0.15)';
                            }
                            
                            if (autoDownloadEnabled) {
                                const dlBtn = document.getElementById('wt-btn-dl');
                                if (dlBtn) dlBtn.click();
                            }
                        }
                    }, 300);
                }, 500);
            });

            btn.addEventListener('click', async () => {
                if (isDownloading) return;

                const hostname = window.location.hostname;
                const usesExplicitIndex = hostname.includes('lezhinus.com') || hostname.includes('lezhin.com') || hostname.includes('webtoon.kakao.com') || hostname.includes('lezhin.jp');

                let finalOrder = [];

                if (usesExplicitIndex && explicitMemoryMap.size > 0) {
                    const sortedKeys = Array.from(explicitMemoryMap.keys()).sort((a, b) => a - b);
                    finalOrder = sortedKeys.map(k => explicitMemoryMap.get(k));
                } else {
                    for (const url of orderedDomUrls) {
                        const data = persistentMemoryQueue.get(url);
                        if (data) finalOrder.push({ url: url, type: data.type });
                    }
                }

                if (finalOrder.length === 0) {
                    alert('No images captured yet. Try scrolling through the chapter first!');
                    return;
                }

                // Increment tracker based strictly on DOM elements for Toptoon JP, and title for others
                let baseTitle = document.title;
                
                if (hostname.includes('toptoon.jp')) {
                    const seriesNameEl = document.querySelector('.subTit');
                    const chapterNameEl = document.querySelector('.tit');
                    let customTitle = [];
                    if (seriesNameEl) customTitle.push(seriesNameEl.textContent.trim());
                    if (chapterNameEl) customTitle.push(chapterNameEl.textContent.trim());
                    
                    if (customTitle.length > 0) {
                        baseTitle = customTitle.join(' ');
                    }
                }
                
                let fName = baseTitle;

                if (baseTitle === lastDownloadTitle) {
                    sameTitleCount++;
                    fName = `Re${sameTitleCount} ${baseTitle}`;
                } else {
                    lastDownloadTitle = baseTitle;
                    sameTitleCount = 0;
                }

                hasTriggeredAutoDlForCurrentCapture = true; 

                isDownloading = true;
                const dlText = document.getElementById('wt-dl-text');
                if (dlText) dlText.textContent = `Starting...`;
                btn.style.background = 'linear-gradient(135deg, #ffb300 0%, #fb8c00 100%)';

                document.dispatchEvent(new CustomEvent('GM_Start_Batch', {
                    detail: { folderName: fName, total: finalOrder.length }
                }));

                finalOrder.forEach((item, index) => {
                    const actualIndex = index + 1;
                    if (item.type === 'blob') {
                        const blob = window.__capturedBlobs.get(item.url);
                        if (blob) {
                            const reader = new FileReader();
                            reader.onload = function() {
                                document.dispatchEvent(new CustomEvent('GM_Process_Item', {
                                    detail: { type: 'blobDataUrl', url: reader.result, index: actualIndex }
                                }));
                            };
                            reader.readAsDataURL(blob);
                        } else {
                            console.warn("Blob missing from cache:", item.url);
                        }
                    } else {
                        document.dispatchEvent(new CustomEvent('GM_Process_Item', {
                            detail: { type: 'httpUrl', url: item.url, index: actualIndex }
                        }));
                    }
                });
            });

            document.body.appendChild(panel);
        };

        const isNextImageLoading = (isLezhinJP, jpContainer) => {
            const containers = document.querySelectorAll(
                '.cut, [data-cut-index], #scroll-list > div, .document-img, .img-wrap, .img_wrap, ' +
                '#viewer-img-list img, #comic-view img, .view-img, ' +
                '#viewer_img_box > div, .image-item, .scroll-img, .page, .VerticalViewer_page_container__gGd_B'
            );

            const viewportHeight = isLezhinJP && jpContainer ? jpContainer.clientHeight : window.innerHeight;
            const lookAhead = viewportHeight * 1.0; 
            const topBound = isLezhinJP && jpContainer ? jpContainer.getBoundingClientRect().top : 0;

            for (let el of containers) {
                const rect = el.getBoundingClientRect();
                if (rect.width < 50 || rect.height < 50) continue;

                if (rect.bottom > topBound && rect.top < topBound + lookAhead) {
                    let hasValidUrl = false;
                    if (el.tagName === 'IMG' && isValidTarget(el.src)) hasValidUrl = true;
                    if (!hasValidUrl) {
                        const bg = el.style.backgroundImage || window.getComputedStyle(el).backgroundImage;
                        if (bg && bg !== 'none' && isValidTarget(bg)) hasValidUrl = true;
                    }
                    if (!hasValidUrl) {
                        const imgs = el.querySelectorAll('img, div');
                        for (let child of imgs) {
                            if (child.tagName === 'IMG' && isValidTarget(child.src)) { hasValidUrl = true; break; }
                            const childBg = child.style.backgroundImage || window.getComputedStyle(child).backgroundImage;
                            if (childBg && childBg !== 'none' && isValidTarget(childBg)) { hasValidUrl = true; break; }
                        }
                    }
                    if (!hasValidUrl) return true;
                }
            }
            return false;
        };

        const checkBottomReached = (hostname, isLezhinJP, jpContainer) => {
            const isLezhinFamily = (hostname.includes('lezhin') || hostname.includes('bomtoon') || hostname.includes('beltoon')) && !isLezhinJP;

            if (isLezhinFamily) {
                const slider = document.querySelector('[role="slider"], [class*="lzSlider__circle"]');
                if (slider && slider.style.left) {
                    if (parseFloat(slider.style.left) >= 99.5) return true;
                }
            }

            if (isLezhinJP && jpContainer) {
                return Math.ceil(jpContainer.scrollTop + jpContainer.clientHeight) >= jpContainer.scrollHeight - 15;
            }

            const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
            const scrollTop = Math.max(document.documentElement.scrollTop, document.body.scrollTop);
            const clientHeight = document.documentElement.clientHeight;
            return Math.ceil(scrollTop + clientHeight) >= scrollHeight - 15;
        };

        const getChapterMaxTotal = () => {
            const hostname = window.location.hostname;
            let max = 0;
            const excludeSliderSites = ['toptoon.jp', 'lezhin.jp', 'webtoon.kakao.com', 'mrblue.com'];
            if (!excludeSliderSites.some(site => hostname.includes(site))) {
                const sliders = document.querySelectorAll('[role="slider"], input[type="range"], [class*="slider" i], [class*="progress" i]');
                sliders.forEach(el => {
                    const maxVal = el.getAttribute('data-max') || el.getAttribute('aria-valuemax') || el.max;
                    if (maxVal && !isNaN(maxVal)) max = Math.max(max, parseInt(maxVal, 10));
                });
                if (max === 0) {
                    const counters = document.querySelectorAll('[class*="count" i], [class*="page" i], [class*="num" i]');
                    counters.forEach(el => {
                        const text = el.innerText || '';
                        const match = text.match(/\d+\s*\/\s*(\d+)/);
                        if (match && match[1]) max = Math.max(max, parseInt(match[1], 10));
                    });
                }
            }
            if (max === 0) {
                max = document.querySelectorAll('.cut, [data-cut-index], #scroll-list > div, .document-img, .img-wrap, .img_wrap, #viewer-img-list img, #comic-view img, .view-img, #viewer_img_box > div, .image-item, .scroll-img, .page, .VerticalViewer_page_container__gGd_B').length;
            }
            return max;
        };

        buildUI();
        window.addEventListener('DOMContentLoaded', buildUI);
        setInterval(buildUI, 1500); 

        setInterval(() => {
            const newPath = window.location.href.split('#')[0];
            const hostname = window.location.hostname;
            
            if (currentUrlPath !== newPath) {
                currentUrlPath = newPath;
                orderedDomUrls.length = 0;
                persistentMemoryQueue.clear();
                explicitMemoryMap.clear();

                lastCapturedCount = 0;
                lastCaptureTime = Date.now();
                hasTriggeredAutoDlForCurrentCapture = false;
                sameTitleCount = 0;

                uiDlTextStr = `Download (0)`;
                const dlText = document.getElementById('wt-dl-text');
                if (dlText) dlText.textContent = uiDlTextStr;
            }

            if (isDownloading) return;

            const currentDomUrls = new Set();
            const currentElements = [];

            const scanTargets = document.querySelectorAll(
                'img, canvas, [style*="background"], .cut, [data-cut-index], #scroll-list > div, ' +
                '.document-img, .img-wrap, .img_wrap, .view-img, #viewer_img_box > div, ' +
                '.image-item, .scroll-img, .page, .VerticalViewer_page_container__gGd_B'
            );

            scanTargets.forEach(el => {
                let u = null;
                if (el.tagName === 'IMG' && isValidTarget(el.src)) {
                    u = el.src;
                } else {
                    const bgImage = el.style.backgroundImage || window.getComputedStyle(el).backgroundImage;
                    if (bgImage && bgImage !== 'none') {
                        const match = bgImage.match(/url\(["']?(.*?)["']?\)/);
                        if (match && match[1] && isValidTarget(match[1])) u = match[1];
                    }
                }

                if (u) {
                    currentDomUrls.add(u);
                    currentElements.push({ url: u, domNode: el });
                }
            });

            const usesExplicitIndex = hostname.includes('lezhinus.com') || hostname.includes('lezhin.com') || hostname.includes('webtoon.kakao.com') || hostname.includes('lezhin.jp');

            let captured = 0;

            if (usesExplicitIndex) {
                for (const url of currentDomUrls) {
                    const nodes = currentElements.filter(e => e.url === url);
                    let explicitIdx = null;

                    for (const n of nodes) {
                        const idx = extractImageIndex(n.domNode);
                        if (idx !== null && !isNaN(idx)) {
                            explicitIdx = idx;
                            break;
                        }
                    }

                    if (explicitIdx !== null) {
                        const type = url.startsWith('blob:') ? 'blob' : 'http';
                        if (!explicitMemoryMap.has(explicitIdx)) {
                            explicitMemoryMap.set(explicitIdx, { url: url, type: type, index: explicitIdx });
                        } else if (type === 'blob' && explicitMemoryMap.get(explicitIdx).type === 'http') {
                            explicitMemoryMap.set(explicitIdx, { url: url, type: 'blob', index: explicitIdx });
                        }
                    }
                }
                captured = explicitMemoryMap.size;
            }
            else {
                const currentDomArray = Array.from(currentDomUrls);
                for (let i = 0; i < currentDomArray.length; i++) {
                    const url = currentDomArray[i];
                    const type = url.startsWith('blob:') ? 'blob' : 'http';

                    if (!persistentMemoryQueue.has(url)) persistentMemoryQueue.set(url, { type: type });

                    if (!orderedDomUrls.includes(url)) {
                        let anchorIdxInOrdered = -1;
                        for (let j = i + 1; j < currentDomArray.length; j++) {
                            const idx = orderedDomUrls.indexOf(currentDomArray[j]);
                            if (idx !== -1) { anchorIdxInOrdered = idx; break; }
                        }

                        if (anchorIdxInOrdered !== -1) {
                            orderedDomUrls.splice(anchorIdxInOrdered, 0, url);
                        } else {
                            if (i > 0) {
                                const prevIdx = orderedDomUrls.indexOf(currentDomArray[i - 1]);
                                if (prevIdx !== -1) orderedDomUrls.splice(prevIdx + 1, 0, url);
                                else orderedDomUrls.push(url);
                            } else {
                                orderedDomUrls.push(url);
                            }
                        }
                    }
                }
                captured = orderedDomUrls.length;
            }

            if (!usesExplicitIndex || (usesExplicitIndex && captured === 0)) {
                captured = orderedDomUrls.length;
            }

            const estimatedTotal = getChapterMaxTotal();
            const displayTotal = Math.max(captured, estimatedTotal);
            const totalStr = displayTotal > 0 ? `/${displayTotal}` : '';

            uiDlTextStr = `Download (${captured}${totalStr})`;
            const dlText = document.getElementById('wt-dl-text');
            if (dlText) dlText.textContent = uiDlTextStr;

            if (captured > lastCapturedCount) {
                lastCapturedCount = captured;
                lastCaptureTime = Date.now();
                hasTriggeredAutoDlForCurrentCapture = false;
            }

            const autoDlExcludeSites = ['lezhinus.com', 'lezhin.com', 'lezhin.jp', 'toptoon.jp'];
            const isExcludedSite = autoDlExcludeSites.some(site => hostname.includes(site));

            if (!isExcludedSite && autoDownloadEnabled && !isDownloading && captured > 0 && !hasTriggeredAutoDlForCurrentCapture) {
                if (Date.now() - lastCaptureTime >= 5000) {
                    hasTriggeredAutoDlForCurrentCapture = true;
                    
                    if (isScrolling) {
                        clearInterval(autoScrollInterval);
                        isScrolling = false;
                        const sBtn = document.getElementById('wt-btn-scroll');
                        if (sBtn) {
                            sBtn.innerHTML = '⏬ Scroll';
                            sBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                            sBtn.style.color = '#fff'; 
                            sBtn.style.borderColor = 'rgba(255,255,255,0.15)';
                        }
                    }
                    
                    const dlBtn = document.getElementById('wt-btn-dl');
                    if (dlBtn) dlBtn.click();
                }
            }

        }, 1200);

        document.addEventListener('GM_Update_Progress', (e) => {
            const s = e.detail;
            const dlText = document.getElementById('wt-dl-text');
            const btn = document.getElementById('wt-btn-dl');
            if (!dlText || !btn) return;

            if (s.processed < s.total) {
                uiDlTextStr = `${s.processed}/${s.total}...`;
                dlText.textContent = uiDlTextStr;
                btn.style.background = 'linear-gradient(135deg, #ffb300 0%, #fb8c00 100%)';
                btn.style.boxShadow = '0 4px 12px rgba(255, 179, 0, 0.3)';
            } else {
                uiDlTextStr = s.duplicates > 0 ? `Done ✅ (${s.duplicates} dupes)` : `Done ✅`;
                dlText.textContent = uiDlTextStr;
                btn.style.background = 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)';
                btn.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
                setTimeout(() => {
                    isDownloading = false;
                    btn.style.background = 'linear-gradient(135deg, #ff4081 0%, #d81b60 100%)';
                    btn.style.boxShadow = '0 4px 12px rgba(255, 64, 129, 0.3)';
                }, 5000);
            }
        });
    };

    // -------------------------------------------------------------------------
    // 3. INJECT SCRIPT
    // -------------------------------------------------------------------------

    const scriptElem = document.createElement('script');
    scriptElem.textContent = `window.__wt_init_auto_dl = ${initialAutoDl}; (` + pageScript.toString() + `)();`;

    if (document.documentElement) {
        document.documentElement.appendChild(scriptElem);
        scriptElem.remove();
    }
})();