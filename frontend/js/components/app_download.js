// ─── Career OS: PWA Install & Android APK Download Component ───
import { showModal } from './modal.js';
import { showToast } from './toast.js';

export function showAppDownloadModal() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);
  const liveUrl = window.location.origin || 'https://career-os-two-woad.vercel.app';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(liveUrl)}&bgcolor=0d1117&color=ffffff&qzone=1`;

  showModal({
    title: '📱 Install Career OS & Download APK',
    confirmText: 'Done',
    cancelText: 'Close',
    onConfirm: (close) => close(),
    bodyHTML: `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);min-width:300px;max-width:560px">
        <!-- Status Banner -->
        <div style="background:${isStandalone ? 'var(--success-bg)' : 'rgba(124,108,240,0.1)'};border:1px solid ${isStandalone ? 'var(--success)' : 'var(--border-accent)'};padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);display:flex;align-items:center;gap:var(--space-3)">
          <span style="font-size:24px">${isStandalone ? '🚀' : '✨'}</span>
          <div>
            <div style="font-weight:600;font-size:var(--text-sm);color:var(--text-primary)">
              ${isStandalone ? 'Running in Standalone App Mode' : 'Install as Native App on Any Device'}
            </div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">
              ${isStandalone ? 'You have installed Career OS. Enjoy full-screen performance and offline caching!' : 'Fast, responsive, works offline, and installs directly without an app store.'}
            </div>
          </div>
        </div>

        <!-- Option 1: PWA 1-Click Install -->
        <div class="glass-card-static" style="padding:var(--space-4);border-radius:var(--radius-md)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-2)">
            <div style="display:flex;align-items:center;gap:var(--space-2)">
              <span style="font-size:20px">⚡</span>
              <div>
                <strong style="font-size:var(--text-sm);color:var(--text-primary)">1-Click PWA Installation</strong>
                <div style="font-size:11px;color:var(--text-tertiary)">Android, Windows, Mac, ChromeOS, & iOS</div>
              </div>
            </div>
            <span style="font-size:10px;background:var(--accent-solid);color:#fff;padding:2px 7px;border-radius:10px;font-weight:600">Recommended</span>
          </div>

          ${isIOS ? `
            <div style="background:rgba(255,255,255,0.03);border:1px dashed var(--border-subtle);border-radius:var(--radius-sm);padding:var(--space-3);margin-top:var(--space-2);font-size:12px;line-height:1.6;color:var(--text-secondary)">
              <strong>To install on iPhone / iPad (Safari):</strong><br>
              1. Tap the <strong>Share</strong> button <span style="font-size:14px">📤</span> at the bottom of Safari.<br>
              2. Scroll down and tap <strong>Add to Home Screen</strong> <span style="font-size:14px">➕</span>.<br>
              3. Tap <strong>Add</strong> in the top right. Career OS will appear on your home screen!
            </div>
          ` : `
            <p style="font-size:11.5px;color:var(--text-secondary);margin:var(--space-2) 0 var(--space-3)">
              Installs Career OS directly to your home screen or desktop application drawer with dedicated windowing and offline caching.
            </p>
            <button class="btn btn-primary" id="btn-trigger-pwa-install" style="width:100%;justify-content:center;gap:var(--space-2)">
              📥 Install Career OS App
            </button>
          `}
        </div>

        <!-- Option 2: Android APK Download -->
        <div class="glass-card-static" style="padding:var(--space-4);border-radius:var(--radius-md)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-2)">
            <div style="display:flex;align-items:center;gap:var(--space-2)">
              <span style="font-size:20px">🤖</span>
              <div>
                <strong style="font-size:var(--text-sm);color:var(--text-primary)">Android Package (.APK)</strong>
                <div style="font-size:11px;color:var(--text-tertiary)">Direct installation for Android devices (8.0+)</div>
              </div>
            </div>
            <span style="font-size:10px;background:rgba(255,255,255,0.08);color:var(--text-secondary);padding:2px 7px;border-radius:10px">Standalone</span>
          </div>
          <p style="font-size:11.5px;color:var(--text-secondary);margin:var(--space-2) 0 var(--space-3)">
            Compiled via GitHub Actions with Android SDK and Capacitor. Download the APK directly to your phone.
          </p>
          <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
            <a class="btn btn-secondary" href="https://github.com/SaiPhaniAnirudh/career-os/releases" target="_blank" rel="noopener" style="flex:1;justify-content:center;gap:var(--space-2);font-size:12px">
              📦 Download APK from GitHub
            </a>
            <a class="btn btn-ghost" href="https://github.com/SaiPhaniAnirudh/career-os/actions/workflows/build-apk.yml" target="_blank" rel="noopener" style="font-size:12px">
              ⚙️ Build Pipeline
            </a>
          </div>
        </div>

        <!-- Option 3: Scan QR Code -->
        <div style="display:flex;align-items:center;gap:var(--space-4);background:rgba(255,255,255,0.02);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);border:1px solid var(--border-subtle)">
          <img src="${qrUrl}" alt="Career OS QR Code" width="80" height="80" style="border-radius:var(--radius-sm);border:1px solid var(--border-subtle);background:#000;display:block" onerror="this.style.display='none'">
          <div>
            <div style="font-weight:600;font-size:12px;color:var(--text-primary);margin-bottom:2px">Scan to Open on Mobile</div>
            <div style="font-size:11px;color:var(--text-secondary);line-height:1.4">
              Point your phone's camera at the QR code to open Career OS on mobile and install it in seconds.
            </div>
            <div style="font-size:10.5px;color:var(--text-tertiary);margin-top:4px">
              URL: <code style="font-size:10px">${escapeHtml(liveUrl)}</code>
            </div>
          </div>
        </div>
      </div>
    `,
  });

  // Attach PWA install click
  const installBtn = document.getElementById('btn-trigger-pwa-install');
  installBtn?.addEventListener('click', async () => {
    const promptEvent = window.deferredInstallPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        showToast('Career OS installation accepted!', 'success');
        window.deferredInstallPrompt = null;
      } else {
        showToast('Installation dismissed', 'info');
      }
    } else {
      // Fallback advice for browsers without active deferred prompt
      showToast('Click the install icon in your browser address bar (top right) to install!', 'info');
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
