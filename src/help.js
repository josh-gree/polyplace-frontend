// A "?" button that opens a modal explaining how to paint with the
// polyplace command-line client. The grid itself is read-only; all
// interaction happens through the client, so this is the one bit of
// onboarding the viewer offers.

const DIALOG_HTML = `
  <button class="help-close" type="button" aria-label="Close">&times;</button>
  <h2>Paint on Polyplace</h2>
  <p>
    This page is a read-only view of an on-chain pixel grid on Polygon.
    To rent cells and set their colour, use the
    <code>polyplace</code> command-line client.
  </p>

  <h3>Run it</h3>
  <p>No install — run straight from PyPI with <code>uvx</code>:</p>
  <pre><code>uvx polyplace-client grid params</code></pre>
  <p>Prefer a short command? Install once, then use <code>polyplace</code>:</p>
  <pre><code>uv tool install polyplace-client</code></pre>

  <h3>Look around — no setup</h3>
  <pre><code>polyplace grid params
polyplace grid cell 500 500
polyplace grid free --limit 10</code></pre>

  <h3>Paint</h3>
  <p>
    You need an Ethereum key with a little POL for gas; PLACE tokens are
    free from the faucet.
  </p>
  <pre><code>export POLYPLACE_PRIVATE_KEY=0x...
polyplace faucet claim                  # 150 PLACE, once a day
polyplace grid rent 500 500 '#e94f37'   # rent + colour a cell (7-day lease)
polyplace grid paint logo.png --at 480 480</code></pre>

  <p class="help-note">
    No install? Every <code>polyplace</code> command also runs as
    <code>uvx polyplace-client &lt;command&gt;</code>.
  </p>

  <p class="help-links">
    <a href="https://pypi.org/project/polyplace-client/" target="_blank" rel="noopener">PyPI</a>
    <span aria-hidden="true">·</span>
    <a href="https://github.com/josh-gree/polyplace-client" target="_blank" rel="noopener">GitHub &amp; full docs</a>
  </p>
`;

export function createHelp() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "help-button";
  button.textContent = "?";
  button.setAttribute("aria-label", "How to use Polyplace");
  button.title = "How to use Polyplace";

  const dialog = document.createElement("dialog");
  dialog.className = "help-dialog";
  dialog.setAttribute("aria-label", "How to use Polyplace");
  dialog.innerHTML = DIALOG_HTML;

  button.addEventListener("click", () => dialog.showModal());
  dialog.querySelector(".help-close").addEventListener("click", () => dialog.close());
  // Click on the backdrop (the dialog element itself, outside its content) closes it.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.body.append(button, dialog);
  return { button, dialog };
}
