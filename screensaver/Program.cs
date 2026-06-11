// Nebula Thoughts — self-contained Windows screensaver host.
//
// Everything it needs (WebView2 managed DLLs, the native WebView2Loader.dll,
// nebula.html and p5.min.js) is embedded as a resource inside this single .scr.
// At launch we extract the runtime files to %LOCALAPPDATA%\NebulaScreensaver\rt,
// resolve the managed assemblies from embedded resources, then render the page.
// => one downloadable file; right-click -> Install works.
//
// Screensaver command-line contract:
//   /s            run the saver
//   /p <hwnd>     preview (no thumbnail — no-op)
//   /c  /c:<hwnd> configuration dialog
//   (no args)     treated as /c
using System;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;

static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        // Must be registered before any method that references WebView2 types runs.
        AppDomain.CurrentDomain.AssemblyResolve += ResolveEmbedded;

        string mode = args.Length > 0 ? args[0].Trim().ToLowerInvariant() : "/c";
        if (mode.StartsWith("/p")) return;            // preview: no thumbnail
        if (mode.StartsWith("/c")) { ShowConfig(); return; }
        RunSaver();                                   // /s or anything else
    }

    static Assembly ResolveEmbedded(object sender, ResolveEventArgs e)
    {
        string name = new AssemblyName(e.Name).Name + ".dll";
        byte[] data = ReadResource(name);
        return data == null ? null : Assembly.Load(data);
    }

    static byte[] ReadResource(string logicalName)
    {
        using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream(logicalName))
        {
            if (s == null) return null;
            using (var ms = new MemoryStream())
            {
                s.CopyTo(ms);
                return ms.ToArray();
            }
        }
    }

    static void ShowConfig()
    {
        MessageBox.Show(
            "Nebula Thoughts 스크린세이버\n\n" +
            "네뷸라 배경을 떠다니는 생물들이 속마음을 말풍선으로 보여줍니다.\n" +
            "마우스를 움직이거나 키를 누르면 종료됩니다.\n\n" +
            "설정 항목은 없습니다 — precipi.com",
            "Nebula Thoughts",
            MessageBoxButtons.OK, MessageBoxIcon.Information);
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool SetDllDirectory(string lpPathName);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern IntPtr LoadLibrary(string lpFileName);

    static void RunSaver()
    {
        string rt;
        try { rt = ExtractRuntime(); }
        catch { return; }   // can't stage files — bail rather than show a frozen screen

        // Make the native WebView2Loader.dll discoverable, then preload it.
        SetDllDirectory(rt);
        LoadLibrary(Path.Combine(rt, "WebView2Loader.dll"));

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        string htmlPath = Path.Combine(rt, "nebula.html");
        var bounds = SystemInformation.VirtualScreen;   // span every monitor
        Application.Run(new SaverForm(bounds, new Uri(htmlPath), rt));
    }

    // Writes embedded runtime files to a per-user folder (idempotent by size).
    static string ExtractRuntime()
    {
        string rt = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "NebulaScreensaver", "rt");
        Directory.CreateDirectory(rt);
        string[] files = {
            "WebView2Loader.dll",
            "nebula.html",
            "p5.min.js"
        };
        foreach (string f in files)
        {
            byte[] data = ReadResource(f);
            if (data == null) continue;
            string dest = Path.Combine(rt, f);
            if (!File.Exists(dest) || new FileInfo(dest).Length != data.Length)
            {
                try { File.WriteAllBytes(dest, data); }
                catch (IOException) { /* in use from a previous run — fine */ }
            }
        }
        return rt;
    }
}
