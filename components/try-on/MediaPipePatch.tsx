// // components/try-on/MediaPipePatch.tsx
// // ── Injects the MediaPipe Module shim BEFORE any other scripts ───────────────
// //
// // Placed in app/layout.tsx <head> via strategy="beforeInteractive"
// // so it runs before React hydration and before any MediaPipe script tags.

// import Script from 'next/script'

// const PATCH_SCRIPT = `
// (function() {
//   if (window.__mediapipePatchApplied) return;
//   window.__mediapipePatchApplied = true;

//   // Patterns that indicate a harmless MediaPipe internal diagnostic abort
//   function isFalseAlarm(msg) {
//     msg = String(msg || '');
//     return (
//       msg.indexOf('arguments_') !== -1 ||
//       msg.indexOf('Module.arguments') !== -1 ||
//       msg.indexOf('plain arguments') !== -1 ||
//       msg.indexOf('jsStackTrace') !== -1 ||
//       msg.indexOf('stackTrace') !== -1 ||
//       msg.indexOf('dataFileDownloads') !== -1 ||
//       msg.indexOf('face_mesh_solution_packed_assets') !== -1 ||
//       msg.indexOf('createMediapipeSolutionsPackedAssets') !== -1 ||
//       /^abort\\b/.test(msg.trim()) ||
//       msg === 'abort' ||
//       msg === 'undefined'
//     );
//   }

//   // Full Emscripten Module shim.
//   // onAbort MUST be a no-op (not a throw) — MediaPipe calls abort() as a
//   // diagnostic check during WASM init and expects execution to continue.
//   var shim = {
//     arguments_:                [],
//     expectedDataFileDownloads: 0,
//     dataFileDownloads:         {},
//     preloadResults:            {},
//     preRun:                    [],
//     postRun:                   [],
//     calledRun:                 false,
//     print:                     function() {},
//     printErr:                  function(t) {
//       if (!isFalseAlarm(t)) console.warn('[MediaPipe]', t);
//     },
//     setStatus:  function() {},
//     locateFile: function(f) { return f; },
//     // KEY FIX: onAbort must NOT throw — return silently for false-alarm aborts.
//     // The WASM runtime checks if abort() is catchable; throwing here kills init.
//     onAbort: function(msg) {
//       if (!isFalseAlarm(String(msg || ''))) {
//         console.error('[MediaPipe] WASM fatal abort:', msg);
//       }
//       // Intentionally do NOT throw — let WASM continue
//     },
//     // Emscripten checks quit() in some builds
//     quit: function(code, e) {
//       if (code !== 0 && !isFalseAlarm(String(e && e.message || ''))) {
//         console.error('[MediaPipe] quit', code, e);
//       }
//     },
//   };

//   if (window.Module && typeof window.Module === 'object') {
//     var m = window.Module;
//     for (var k in shim) {
//       if (!(k in m)) m[k] = shim[k];
//     }
//     // Always override onAbort and quit — they may have been set incorrectly
//     m.onAbort = shim.onAbort;
//     m.quit    = shim.quit;
//   } else {
//     window.Module = shim;
//   }

//   // The asset loader does:
//   //   var Module = typeof createMediapipeSolutionsPackedAssets !== 'undefined'
//   //                ? createMediapipeSolutionsPackedAssets({}) : {};
//   // Without this shim it creates an empty Module and crashes on dataFileDownloads.
//   if (typeof window.createMediapipeSolutionsPackedAssets === 'undefined') {
//     window.createMediapipeSolutionsPackedAssets = function(overrides) {
//       return Object.assign({}, window.Module, overrides || {});
//     };
//   }

//   // Suppress the Next.js dev error overlay for all MediaPipe false-alarm errors.
//   // Must use capturing phase (true) to intercept before React's handlers.
//   function suppressFalseAlarm(e) {
//     var msg = '';
//     if (e.message) msg = e.message;
//     else if (e.reason) msg = e.reason.message || String(e.reason);
//     if (isFalseAlarm(msg)) {
//       e.preventDefault();
//       e.stopImmediatePropagation();
//     }
//   }
//   window.addEventListener('error',              suppressFalseAlarm, true);
//   window.addEventListener('unhandledrejection', suppressFalseAlarm, true);
// })();
// `.trim()

// export function MediaPipePatch() {
//   return (
//     <Script
//       id="mediapipe-module-patch"
//       strategy="beforeInteractive"
//       dangerouslySetInnerHTML={{ __html: PATCH_SCRIPT }}
//     />
//   )
// }

import Script from 'next/script'

const PATCH_SCRIPT = `
(function () {
  if (window.__mediapipePatchApplied) return;
  window.__mediapipePatchApplied = true;

  function getMessage(err) {
    if (!err) return '';
    if (typeof err === 'string') return err;
    if (err.message) return String(err.message);
    if (err.reason && err.reason.message) return String(err.reason.message);
    if (err.error && err.error.message) return String(err.error.message);
    return String(err);
  }

  function isFalseAlarm(msg) {
    msg = String(msg || '');
    return (
      msg.indexOf('arguments_') !== -1 ||
      msg.indexOf('Module.arguments') !== -1 ||
      msg.indexOf('plain arguments') !== -1 ||
      msg.indexOf('Module.arguments has been replaced with plain arguments_') !== -1 ||
      msg.indexOf('jsStackTrace') !== -1 ||
      msg.indexOf('stackTrace') !== -1 ||
      msg.indexOf('dataFileDownloads') !== -1 ||
      msg.indexOf('face_mesh_solution_packed_assets') !== -1 ||
      msg.indexOf('createMediapipeSolutionsPackedAssets') !== -1 ||
      msg.indexOf('createMediapipeSolutionsWasm') !== -1 ||
      /^abort\\b/.test(msg.trim()) ||
      msg === 'abort' ||
      msg === 'undefined'
    );
  }

  var shim = {
    arguments: undefined,
    arguments_: undefined,
    thisProgram: undefined,
    quit: function (code, e) {
      var msg = e && e.message ? e.message : String(e || '');
      if (code !== 0 && !isFalseAlarm(msg)) {
        console.error('[MediaPipe] quit', code, e);
      }
    },
    preRun: [],
    postRun: [],
    print: function () {},
    printErr: function (t) {
      if (!isFalseAlarm(getMessage(t))) console.warn('[MediaPipe]', t);
    },
    canvas: undefined,
    setStatus: function () {},
    monitorRunDependencies: function () {},
    locateFile: function (f) { return f; },
    onAbort: function (msg) {
      if (!isFalseAlarm(String(msg || ''))) {
        console.error('[MediaPipe] WASM fatal abort:', msg);
      }
    },
    expectedDataFileDownloads: 0,
    dataFileDownloads: {},
    preloadResults: {},
    calledRun: false,
  };

  if (window.Module && typeof window.Module === 'object') {
    var m = window.Module;
    for (var k in shim) {
      if (!(k in m)) m[k] = shim[k];
    }
    m.onAbort = shim.onAbort;
    m.quit = shim.quit;
    m.printErr = shim.printErr;
  } else {
    window.Module = shim;
  }

  function buildModule(overrides) {
    return Object.assign({}, window.Module, overrides || {});
  }

  if (typeof window.createMediapipeSolutionsWasm === 'undefined') {
    window.createMediapipeSolutionsWasm = buildModule;
  }

  if (typeof window.createMediapipeSolutionsPackedAssets === 'undefined') {
    window.createMediapipeSolutionsPackedAssets = buildModule;
  }

  function suppressFalseAlarm(e) {
    var msg = '';
    if (e && e.message) msg = e.message;
    else if (e && e.reason) msg = (e.reason && e.reason.message) || String(e.reason);
    else if (e && e.error) msg = (e.error && e.error.message) || String(e.error);

    if (isFalseAlarm(msg)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }

  window.addEventListener('error', suppressFalseAlarm, true);
  window.addEventListener('unhandledrejection', suppressFalseAlarm, true);
})();
`.trim()

export function MediaPipePatch() {
  return (
    <Script
      id="mediapipe-module-patch"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: PATCH_SCRIPT }}
    />
  )
}