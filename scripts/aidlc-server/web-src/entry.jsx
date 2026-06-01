/* entry.jsx — boot. Fetch the workspace state from aidlc-server, expose it as
   window.SEED (so every workspace's `window.SEED.xxx` keeps working unchanged),
   then mount the app. Concatenated LAST in the build. */
(function () {
  const root = document.getElementById('root');
  const fail = (msg) => {
    root.innerHTML =
      '<div style="max-width:520px;margin:18vh auto;padding:0 24px;font-family:\'Hanken Grotesk\',system-ui,sans-serif;color:#6b6155">' +
      '<div style="font-family:\'Newsreader\',Georgia,serif;font-size:26px;color:#2b2722;margin-bottom:10px">Workspace unavailable</div>' +
      '<p style="font-size:14px;line-height:1.6">' + msg + '</p>' +
      '<p style="font-size:13px;line-height:1.6;color:#968a7b">Start it from your project root with <code>/aidlc workspace</code>, ' +
      'or run <code>aidlc-server</code> directly, then reload.</p></div>';
  };
  fetch('/api/state')
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(state => {
      window.SEED = state;
      ReactDOM.createRoot(root).render(
        <ToastProvider><AppShell /></ToastProvider>
      );
    })
    .catch(err => fail('Could not load <code>/api/state</code> (' + err.message + '). Is <code>aidlc-server</code> running?'));
})();
