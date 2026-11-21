package it.hich.officina;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
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
    private static final int SALVA_IN = 2;
    private static final int SCEGLI_INPUT = 3;
    private WebView web;
    private WebView stampa;                         // la pagina da stampare resta viva finche la stampa parte
    private String daSalvare;                       // testo in attesa della cartella scelta con "Salva in..."
    private ValueCallback<Uri[]> attesaInput;       // <input type=file> della pagina (foto e file)
    private Uri fotoCamera;

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
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (attesaInput != null) attesaInput.onReceiveValue(null);
                attesaInput = cb;
                Intent scegli = p.createIntent();
                Intent chooser = Intent.createChooser(scegli, "Scegli");
                boolean immagini = false;
                for (String t : p.getAcceptTypes()) if (t != null && t.startsWith("image")) immagini = true;
                fotoCamera = null;
                if (immagini && Build.VERSION.SDK_INT >= 29) {
                    try {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.MediaColumns.DISPLAY_NAME, "pezzo_" + System.currentTimeMillis() + ".jpg");
                        cv.put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg");
                        cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Hich-Officina");
                        fotoCamera = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cv);
                        Intent foto = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                        foto.putExtra(MediaStore.EXTRA_OUTPUT, fotoCamera);
                        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{foto});
                    } catch (Exception e) { fotoCamera = null; }
                }
                try { startActivityForResult(chooser, SCEGLI_INPUT); } catch (Exception e) { attesaInput = null; return false; }
                return true;
            }
        });
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
        if (richiesta == SCEGLI_INPUT) {
            Uri[] scelti = null;
            if (esito == RESULT_OK) {
                if (dati != null && dati.getClipData() != null) {
                    scelti = new Uri[dati.getClipData().getItemCount()];
                    for (int i = 0; i < scelti.length; i++) scelti[i] = dati.getClipData().getItemAt(i).getUri();
                } else if (dati != null && dati.getData() != null) scelti = new Uri[]{dati.getData()};
                else if (fotoCamera != null) scelti = new Uri[]{fotoCamera};
            }
            if (attesaInput != null) attesaInput.onReceiveValue(scelti);
            attesaInput = null;
            return;
        }
        if (richiesta == SALVA_IN) {
            if (esito == RESULT_OK && dati != null && dati.getData() != null && daSalvare != null) {
                try (OutputStream o = getContentResolver().openOutputStream(dati.getData(), "wt")) {
                    o.write(daSalvare.getBytes(StandardCharsets.UTF_8));
                    avviso("File salvato");
                } catch (Exception e) { avviso("Non salvato: " + e.getMessage()); }
            }
            daSalvare = null;
            return;
        }
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

        /** "Salva in...": Android fa scegliere la cartella (anche di rete, se un'app la offre). */
        @JavascriptInterface
        public void salvaIn(String nome, String testo) {
            runOnUiThread(() -> {
                daSalvare = testo;
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_TITLE, nome);
                try { startActivityForResult(i, SALVA_IN); } catch (Exception e) { avviso("Nessuna app per scegliere la cartella"); }
            });
        }

        /** Condivide un file vero (salvato in Download/Hich-Officina), non solo il testo. */
        @JavascriptInterface
        public void condividiFile(String nome, String testo, String tipo) {
            if (Build.VERSION.SDK_INT < 29) { condividi(nome, testo); return; }
            try {
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.MediaColumns.DISPLAY_NAME, nome);
                cv.put(MediaStore.MediaColumns.MIME_TYPE, tipo == null || tipo.isEmpty() ? "text/plain" : tipo);
                cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Hich-Officina");
                Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (u == null) throw new Exception("cartella Download non disponibile");
                try (OutputStream o = getContentResolver().openOutputStream(u)) { o.write(testo.getBytes(StandardCharsets.UTF_8)); }
                runOnUiThread(() -> {
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType(tipo == null || tipo.isEmpty() ? "text/plain" : tipo);
                    i.putExtra(Intent.EXTRA_STREAM, u);
                    i.putExtra(Intent.EXTRA_SUBJECT, nome);
                    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(i, "Condividi " + nome));
                });
            } catch (Exception e) {
                avviso("Non condiviso: " + e.getMessage());
            }
        }

        /** Manda il programma alla macchina via FTP; la risposta arriva a window.__ftpEsito(ok, messaggio). */
        @JavascriptInterface
        public void inviaFtp(String host, int porta, String utente, String password, String cartella, String nome, String testo) {
            new Thread(() -> {
                boolean ok;
                String msg;
                try {
                    msg = Ftp.invia(host, porta, utente, password, cartella, nome, testo.getBytes(StandardCharsets.ISO_8859_1), 8000);
                    ok = true;
                } catch (Exception e) {
                    msg = "Non inviato: " + e.getMessage();
                    ok = false;
                }
                final String js = "window.__ftpEsito && window.__ftpEsito(" + ok + "," + JSONObject.quote(msg) + ")";
                runOnUiThread(() -> web.evaluateJavascript(js, null));
            }).start();
        }

        /** Stampa (o salva in PDF) una pagina HTML, come il foglio di attrezzaggio. */
        @JavascriptInterface
        public void stampa(String titolo, String html) {
            runOnUiThread(() -> {
                stampa = new WebView(MainActivity.this);
                stampa.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView v, String url) {
                        PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        if (pm != null) pm.print(titolo, v.createPrintDocumentAdapter(titolo), new PrintAttributes.Builder().build());
                    }
                });
                stampa.loadDataWithBaseURL("file:///android_asset/www/", html, "text/html", "UTF-8", null);
            });
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
