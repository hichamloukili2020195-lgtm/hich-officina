package it.hich.officina;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.Writer;
import java.io.OutputStreamWriter;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Invio di un file a un server FTP (modo passivo), senza librerie: basta per mandare un programma alla macchina. */
public final class Ftp {
    private Ftp() { }

    /** Manda il file e ritorna una frase per l'operatore; se qualcosa va storto lancia IOException con il motivo. */
    public static String invia(String host, int porta, String utente, String password, String cartella,
                               String nome, byte[] dati, int attesaMs) throws IOException {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(host, porta > 0 ? porta : 21), attesaMs);
            s.setSoTimeout(attesaMs);
            BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream(), StandardCharsets.ISO_8859_1));
            Writer out = new OutputStreamWriter(s.getOutputStream(), StandardCharsets.ISO_8859_1);
            atteso(risposta(in), 2, "il server non risponde come un FTP");
            String r = comando(out, in, "USER " + (utente == null || utente.isEmpty() ? "anonymous" : utente));
            if (r.startsWith("331") || r.startsWith("332")) r = comando(out, in, "PASS " + (password == null ? "" : password));
            atteso(r, 2, "utente o password non accettati");
            atteso(comando(out, in, "TYPE I"), 2, "il server non accetta il modo binario");
            if (cartella != null && !cartella.trim().isEmpty()) {
                atteso(comando(out, in, "CWD " + cartella.trim()), 2, "la cartella " + cartella + " non esiste sulla macchina");
            }
            String pasv = comando(out, in, "PASV");
            atteso(pasv, 2, "il server non accetta il modo passivo");
            Matcher m = Pattern.compile("(\\d+),(\\d+),(\\d+),(\\d+),(\\d+),(\\d+)").matcher(pasv);
            if (!m.find()) throw new IOException("risposta PASV non capita: " + pasv);
            String ip = m.group(1) + "." + m.group(2) + "." + m.group(3) + "." + m.group(4);
            if (ip.equals("0.0.0.0")) ip = host;
            int pDati = Integer.parseInt(m.group(5)) * 256 + Integer.parseInt(m.group(6));
            try (Socket d = apriDati(ip, host, pDati, attesaMs)) {
                atteso(comando(out, in, "STOR " + nome), 1, "la macchina non accetta il file " + nome);
                OutputStream od = d.getOutputStream();
                od.write(dati);
                od.flush();
            }
            atteso(risposta(in), 2, "il file non e arrivato intero");
            try { comando(out, in, "QUIT"); } catch (IOException e) { /* gia chiuso */ }
            return "Inviato " + nome + " a " + host + (cartella != null && !cartella.trim().isEmpty() ? " in " + cartella.trim() : "");
        }
    }

    private static Socket apriDati(String ip, String host, int porta, int attesaMs) throws IOException {
        Socket d = new Socket();
        try {
            d.connect(new InetSocketAddress(ip, porta), attesaMs);
            return d;
        } catch (IOException e) {
            d.close();
            if (ip.equals(host)) throw e;
            // alcune macchine danno un indirizzo interno diverso: si riprova con quello scritto dall'operatore
            Socket d2 = new Socket();
            d2.connect(new InetSocketAddress(host, porta), attesaMs);
            return d2;
        }
    }

    private static String comando(Writer out, BufferedReader in, String c) throws IOException {
        out.write(c + "\r\n");
        out.flush();
        return risposta(in);
    }

    /** Una risposta, anche su piu righe (123-... fino a 123 ...). */
    private static String risposta(BufferedReader in) throws IOException {
        String r = in.readLine();
        if (r == null) throw new IOException("il server ha chiuso la connessione");
        if (r.length() >= 4 && r.charAt(3) == '-') {
            String codice = r.substring(0, 3);
            String l;
            while ((l = in.readLine()) != null) {
                if (l.startsWith(codice + " ")) { r = l; break; }
            }
        }
        return r;
    }

    private static void atteso(String r, int classe, String motivo) throws IOException {
        if (r == null || r.isEmpty() || r.charAt(0) != (char) ('0' + classe)) throw new IOException(motivo + " (" + r + ")");
    }
}
