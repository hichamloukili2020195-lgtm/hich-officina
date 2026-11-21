package it.hich.officina;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Apre Hich-Officina (assets/www) in una WebView e le da salvataggio, condivisione, appunti e scelta dei file. */
public class MainActivity extends Activity {
    private static final int SCEGLI_FILE = 1;
    private WebView web;

    @Override
    protected void onCreate(Bundle stato) {
        super.onCreate(stato);
        getWindow().setStatusBarColor(0xff0b1220);
        getWindow().setNavigationBarColor(0xff111a2c);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setTextZoom(100);
        web.setBackgroundColor(0xff0b1220);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("file".equals(u.getScheme())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { /* nessuna app */ }
                return true;
            }
        });
        web.addJavascriptInterface(new Ponte(), "Android");
        setContentView(web);
        if (stato != null) web.restoreState(stato);
        else web.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    protected void onSaveInstanceState(Bundle stato) {
        super.onSaveInstanceState(stato);
        web.saveState(stato);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        // Indietro: nell'app si torna alla schermata prima; dalla home si esce
        web.evaluateJavascript("(window.App && App.attuale && App.attuale() !== 'home') ? (App.indietro(), 'si') : 'no'", v -> {
            if (v == null || !v.contains("si")) finish();
        });
    }

    @Override
    protected void onActivityResult(int richiesta, int esito, Intent dati) {
        super.onActivityResult(richiesta, esito, dati);
        if (richiesta != SCEGLI_FILE || esito != RESULT_OK || dati == null || dati.getData() == null) return;
        try (InputStream in = getContentResolver().openInputStream(dati.getData())) {
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
            String testo = new String(b.toByteArray(), StandardCharsets.UTF_8);
            web.evaluateJavascript("window.__fileScelto && window.__fileScelto(" + JSONObject.quote(testo) + ")", null);
        } catch (Exception e) {
            avviso("Il file non si legge: " + e.getMessage());
        }
    }

    private void avviso(String t) {
        runOnUiThread(() -> Toast.makeText(this, t, Toast.LENGTH_LONG).show());
    }

    /** Le funzioni che la pagina chiama con window.Android. */
    private class Ponte {
        @JavascriptInterface
        public String salvaFile(String nome, String testo) {
            byte[] dati = testo.getBytes(StandardCharsets.UTF_8);
            try {
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, nome);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE, "text/plain");
                    cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Hich-Officina");
                    Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (u == null) throw new Exception("cartella Download non disponibile");
                    try (OutputStream o = getContentResolver().openOutputStream(u)) { o.write(dati); }
                    return "Salvato in Download/Hich-Officina/" + nome;
                }
                File cartella = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                File f = new File(cartella, nome);
                try (OutputStream o = new FileOutputStream(f)) { o.write(dati); }
                return "Salvato in " + f.getAbsolutePath();
            } catch (Exception e) {
                return "Non salvato: " + e.getMessage();
            }
        }

        @JavascriptInterface
        public void condividi(String nome, String testo) {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_SUBJECT, nome);
                i.putExtra(Intent.EXTRA_TEXT, testo);
                startActivity(Intent.createChooser(i, "Condividi " + nome));
            });
        }

        @JavascriptInterface
        public boolean copia(String testo) {
            ClipboardManager c = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
            if (c == null) return false;
            c.setPrimaryClip(ClipData.newPlainText("Hich-Officina", testo));
            return true;
        }

        @JavascriptInterface
        public void scegliFile() {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try { startActivityForResult(i, SCEGLI_FILE); } catch (Exception e) { avviso("Nessuna app per scegliere i file"); }
            });
        }
    }
}
