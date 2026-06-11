// Fullscreen WebView2 host window. Loads the extracted nebula.html and quits on
// any real user input. Kept in its own file so it is only JIT-compiled (and its
// WebView2 references resolved) after Program.Main has registered the embedded
// assembly resolver.
using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

sealed class SaverForm : Form
{
    private readonly WebView2 _web = new WebView2();
    private readonly Uri _source;
    private readonly string _runtimeDir;
    private readonly DateTime _start = DateTime.UtcNow;
    private bool _ready;

    public SaverForm(Rectangle bounds, Uri source, string runtimeDir)
    {
        _source = source;
        _runtimeDir = runtimeDir;

        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.Manual;
        Bounds = bounds;
        TopMost = true;
        ShowInTaskbar = false;
        BackColor = Color.Black;
        KeyPreview = true;
        DoubleBuffered = true;
        Cursor.Hide();

        _web.Dock = DockStyle.Fill;
        _web.DefaultBackgroundColor = Color.Black;
        Controls.Add(_web);

        // Exit on input that reaches the form chrome (e.g. before the page loads).
        MouseMove += delegate { RequestExit(); };
        KeyDown += delegate { RequestExit(); };
        MouseDown += delegate { RequestExit(); };

        Load += async delegate { await InitWebAsync(); };
    }

    private void RequestExit()
    {
        // Ignore the synthetic input that fires right as the saver launches.
        if (!_ready || (DateTime.UtcNow - _start).TotalMilliseconds < 1000) return;
        try { Application.Exit(); } catch { }
    }

    private async System.Threading.Tasks.Task InitWebAsync()
    {
        try
        {
            string udf = Path.Combine(_runtimeDir, "wv2data");
            var env = await CoreWebView2Environment.CreateAsync(null, udf, null);
            await _web.EnsureCoreWebView2Async(env);

            var core = _web.CoreWebView2;
            core.Settings.AreDefaultContextMenusEnabled = false;
            core.Settings.AreDevToolsEnabled = false;
            core.Settings.IsZoomControlEnabled = false;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.AreBrowserAcceleratorKeysEnabled = false;

            core.WebMessageReceived += delegate { RequestExit(); };
            await core.AddScriptToExecuteOnDocumentCreatedAsync(ExitOnInputScript);

            _web.Source = _source;
            _ready = true;
        }
        catch (Exception ex)
        {
            try { File.WriteAllText(Path.Combine(Path.GetTempPath(), "nebula_saver.log"), ex.ToString()); } catch { }
            try { Application.Exit(); } catch { }
        }
    }

    // Runs before the page's own scripts; turns any user input into an exit.
    private const string ExitOnInputScript = @"
        (function () {
            var lx = null, ly = null;
            function quit() {
                try { window.chrome.webview.postMessage('exit'); } catch (e) {}
            }
            window.addEventListener('mousemove', function (e) {
                if (lx === null) { lx = e.screenX; ly = e.screenY; return; }
                if (Math.abs(e.screenX - lx) > 4 || Math.abs(e.screenY - ly) > 4) quit();
            }, true);
            ['mousedown','keydown','wheel','touchstart'].forEach(function (t) {
                window.addEventListener(t, quit, true);
            });
        })();";
}
