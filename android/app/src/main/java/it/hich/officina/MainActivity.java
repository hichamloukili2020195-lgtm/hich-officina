package it.hich.officina;

import android.app.Activity;
import android.content.ClipData;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.graphics.Rect;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
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

import org.json.JSONArray;
import org.json.JSONObject;

import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.text.TextRecognizer;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** Apre Hich-Officina (assets/www) in una WebView e le da salvataggio, condivisione, appunti e scelta dei file. */
public class MainActivity extends Activity {
    private static final int SCEGLI_FILE = 1;
    private static final int SALVA_IN = 2;
    private static final int SCEGLI_INPUT = 3;
    private static final int LEGGI_FOTO = 4;
    private WebView web;
    private WebView stampa;                         // la pagina da stampare resta viva finche la stampa parte
    private String daSalvare;                       // testo in attesa della cartella scelta con "Salva in..."
    private ValueCallback<Uri[]> attesaInput;       // <input type=file> della pagina (foto e file)
    private Uri fotoCamera;

    /** Android 15 e successivi disegnano sotto barra di stato e tasti: lascio i margini al sistema,
     *  cosi il contenuto non resta coperto (su Android piu vecchi non cambia nulla). */
    private void margini() {
        if (Build.VERSION.SDK_INT < 35) return;
        final android.view.View radice = findViewById(android.R.id.content);
        radice.setBackgroundColor(0xff0b1220);
        radice.setOnApplyWindowInsetsListener((v, ins) -> {
            android.graphics.Insets b = ins.getInsets(android.view.WindowInsets.Type.systemBars()
                    | android.view.WindowInsets.Type.displayCutout() | android.view.WindowInsets.Type.ime());
            v.setPadding(b.left, b.top, b.right, b.bottom);
            return android.view.WindowInsets.CONSUMED;
        });
        radice.requestApplyInsets();
    }

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
                // "Scatta una foto": il campo ha capture, si apre subito la fotocamera
                if (immagini && p.isCaptureEnabled() && Build.VERSION.SDK_INT >= 29) {
                    try {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.MediaColumns.DISPLAY_NAME, "pezzo_" + System.currentTimeMillis() + ".jpg");
                        cv.put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg");
                        cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Hich-Officina");
                        fotoCamera = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cv);
                        Intent foto = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                        foto.putExtra(MediaStore.EXTRA_OUTPUT, fotoCamera);
                        startActivityForResult(foto, SCEGLI_INPUT);
                        return true;
                    } catch (Exception e) { fotoCamera = null; }
                }
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
        margini();
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
            if (scelti == null && fotoCamera != null) { try { getContentResolver().delete(fotoCamera, null, null); } catch (Exception e) { /* niente */ } }
            if (attesaInput != null) attesaInput.onReceiveValue(scelti);
            attesaInput = null;
            return;
        }
        if (richiesta == LEGGI_FOTO) {
            Uri u = null;
            if (esito == RESULT_OK) u = (dati != null && dati.getData() != null) ? dati.getData() : fotoCamera;
            if (u == null) { rispostaFoto(null, "Nessuna foto"); return; }
            leggiTesto(u);
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

    /** Legge il testo della foto sul telefono e lo manda alla pagina, riga per riga dall'alto. */
    private void leggiTesto(Uri u) {
        try {
            InputImage img = InputImage.fromFilePath(this, u);
            TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS).process(img)
                .addOnSuccessListener(t -> rispostaFoto(righe(t), null))
                .addOnFailureListener(e -> rispostaFoto(null, "Lettura non riuscita: " + e.getMessage()));
        } catch (Exception e) {
            rispostaFoto(null, "Foto non leggibile: " + e.getMessage());
        }
    }

    /** Le righe del testo letto: i pezzi alla stessa altezza (numero di riga e programma) stanno nella stessa riga. */
    private static String righe(Text t) {
        List<float[]> pos = new ArrayList<>();      // centro y, altezza, sinistra
        List<String> testi = new ArrayList<>();
        for (Text.TextBlock b : t.getTextBlocks()) for (Text.Line l : b.getLines()) {
            Rect r = l.getBoundingBox();
            if (r == null) continue;
            pos.add(new float[]{r.exactCenterY(), r.height(), r.left});
            testi.add(l.getText());
        }
        Integer[] ordine = new Integer[pos.size()];
        for (int i = 0; i < ordine.length; i++) ordine[i] = i;
        java.util.Arrays.sort(ordine, (a, b) -> Float.compare(pos.get(a)[0], pos.get(b)[0]));
        StringBuilder out = new StringBuilder();
        List<Integer> riga = new ArrayList<>();
        float centro = -1, alto = 0;
        for (int k = 0; k <= ordine.length; k++) {
            boolean nuova = k == ordine.length || (centro >= 0 && Math.abs(pos.get(ordine[k])[0] - centro) > Math.max(4, alto * 0.55f));
            if (nuova && !riga.isEmpty()) {
                riga.sort((a, b) -> Float.compare(pos.get(a)[2], pos.get(b)[2]));
                StringBuilder r = new StringBuilder();
                for (Integer i : riga) { if (r.length() > 0) r.append(' '); r.append(testi.get(i)); }
                out.append(r).append('\n');
                riga.clear();
            }
            if (k == ordine.length) break;
            int i = ordine[k];
            if (riga.isEmpty()) { centro = pos.get(i)[0]; alto = pos.get(i)[1]; }
            riga.add(i);
        }
        return out.toString();
    }


    /** Le righe lette con la posizione sulla foto (in pixel della foto). rot = 90 se lette sulla foto girata. */
    private static void aggiungiRighe(Text t, int rot, int H, JSONArray out, List<float[]> giaBox, List<String> giaTesto) throws Exception {
        for (Text.TextBlock b : t.getTextBlocks()) for (Text.Line l : b.getLines()) {
            Rect r = l.getBoundingBox();
            if (r == null) continue;
            float x0, y0, x1, y1;
            if (rot == 90) { x0 = r.top; x1 = r.bottom; y0 = H - r.right; y1 = H - r.left; }   // foto girata di 90 gradi in senso orario
            else { x0 = r.left; x1 = r.right; y0 = r.top; y1 = r.bottom; }
            String testo = l.getText().trim();
            if (testo.isEmpty()) continue;
            boolean doppia = false;
            for (int i = 0; i < giaBox.size(); i++) {
                float[] g = giaBox.get(i);
                float ix = Math.max(0, Math.min(x1, g[2]) - Math.max(x0, g[0])), iy = Math.max(0, Math.min(y1, g[3]) - Math.max(y0, g[1]));
                float inter = ix * iy, area = Math.min((x1 - x0) * (y1 - y0), (g[2] - g[0]) * (g[3] - g[1]));
                if (area > 0 && inter / area > 0.5f) { doppia = true; break; }
            }
            if (doppia) continue;
            giaBox.add(new float[]{x0, y0, x1, y1}); giaTesto.add(testo);
            JSONObject o = new JSONObject();
            o.put("t", testo); o.put("x", x0); o.put("y", y0); o.put("w", x1 - x0); o.put("h", y1 - y0); o.put("r", rot);
            out.put(o);
        }
    }

    private void rispostaRighe(String json, String errore) {
        final String js = "window.__righeLette && window.__righeLette(" + (json == null ? "null" : json) + "," + (errore == null ? "null" : JSONObject.quote(errore)) + ")";
        runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    private void rispostaFoto(String testo, String errore) {
        final String js = "window.__fotoLetta && window.__fotoLetta(" + (testo == null ? "null" : JSONObject.quote(testo)) + "," + (errore == null ? "null" : JSONObject.quote(errore)) + ")";
        runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    private void avviso(String t) {
        runOnUiThread(() -> Toast.makeText(this, t, Toast.LENGTH_LONG).show());
    }

    /** Le funzioni che la pagina chiama con window.Android. */
    private class Ponte {
        /** Legge il testo di una foto data dalla pagina (data URL), con la posizione di ogni riga; anche le scritte in verticale. */
        @JavascriptInterface
        public void leggiImmagine(String dati) {
            new Thread(() -> {
                try {
                    byte[] by = android.util.Base64.decode(dati.substring(dati.indexOf(',') + 1), android.util.Base64.DEFAULT);
                    Bitmap bmp = BitmapFactory.decodeByteArray(by, 0, by.length);
                    if (bmp == null) { rispostaRighe(null, "Foto non leggibile"); return; }
                    int W = bmp.getWidth(), H = bmp.getHeight();
                    TextRecognizer tr = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
                    JSONArray righe = new JSONArray();
                    List<float[]> box = new ArrayList<>();
                    List<String> testi = new ArrayList<>();
                    aggiungiRighe(Tasks.await(tr.process(InputImage.fromBitmap(bmp, 0))), 0, H, righe, box, testi);
                    Matrix m = new Matrix();
                    m.postRotate(90);
                    Bitmap girata = Bitmap.createBitmap(bmp, 0, 0, W, H, m, true);
                    aggiungiRighe(Tasks.await(tr.process(InputImage.fromBitmap(girata, 0))), 90, H, righe, box, testi);
                    JSONObject o = new JSONObject();
                    o.put("w", W); o.put("h", H); o.put("righe", righe);
                    rispostaRighe(o.toString(), null);
                } catch (Exception e) {
                    rispostaRighe(null, "Lettura non riuscita: " + e.getMessage());
                }
            }).start();
        }

        /** Schermo intero del disegno: "orizzontale" o "verticale" blocca lo schermo, "libero" segue il sensore. */
        @JavascriptInterface
        public void orientamento(String modo) {
            runOnUiThread(() -> setRequestedOrientation("orizzontale".equals(modo) ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE : "verticale".equals(modo) ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED));
        }

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

        /** Foto di un programma (fotocamera o galleria): il testo letto arriva a window.__fotoLetta(testo, errore). */
        @JavascriptInterface
        public void leggiFoto() {
            runOnUiThread(() -> {
                Intent galleria = new Intent(Intent.ACTION_GET_CONTENT);
                galleria.setType("image/*");
                galleria.addCategory(Intent.CATEGORY_OPENABLE);
                Intent chooser = Intent.createChooser(galleria, "Foto del programma");
                fotoCamera = null;
                if (Build.VERSION.SDK_INT >= 29) {
                    try {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.MediaColumns.DISPLAY_NAME, "programma_" + System.currentTimeMillis() + ".jpg");
                        cv.put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg");
                        cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Hich-Officina");
                        fotoCamera = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cv);
                        Intent foto = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                        foto.putExtra(MediaStore.EXTRA_OUTPUT, fotoCamera);
                        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{foto});
                    } catch (Exception e) { fotoCamera = null; }
                }
                try { startActivityForResult(chooser, LEGGI_FOTO); } catch (Exception e) { rispostaFoto(null, "Nessuna app per le foto"); }
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
