package com.famousmobiles.staff;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

public class AndroidPdfBridge {
    private final Activity activity;

    public AndroidPdfBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public boolean isNative() {
        return true;
    }

    @JavascriptInterface
    public void printPdf(String base64Data, String fileName) {
        activity.runOnUiThread(() -> {
            try {
                File pdfFile = writeBase64ToCache(base64Data, fileName);
                if (pdfFile == null || !pdfFile.exists()) {
                    Toast.makeText(activity, "Error preparing PDF for print", Toast.LENGTH_SHORT).show();
                    return;
                }

                PrintManager printManager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
                if (printManager != null) {
                    String jobName = fileName != null ? fileName : "Famous Mobiles Document";
                    PdfDocumentAdapter adapter = new PdfDocumentAdapter(activity, pdfFile);
                    printManager.print(jobName, adapter, new PrintAttributes.Builder().build());
                } else {
                    Toast.makeText(activity, "Print service unavailable on this device", Toast.LENGTH_SHORT).show();
                }
            } catch (Exception e) {
                e.printStackTrace();
                Toast.makeText(activity, "Print error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    @JavascriptInterface
    public void saveAndOpenPdf(String base64Data, String fileName) {
        activity.runOnUiThread(() -> {
            try {
                File pdfFile = writeBase64ToCache(base64Data, fileName);
                if (pdfFile == null || !pdfFile.exists()) {
                    Toast.makeText(activity, "Error preparing PDF file", Toast.LENGTH_SHORT).show();
                    return;
                }

                // 1. Save copy to system Downloads directory
                saveToDownloads(pdfFile, fileName);

                // 2. Open via FileProvider intent
                Uri uri = FileProvider.getUriForFile(
                        activity,
                        activity.getPackageName() + ".fileprovider",
                        pdfFile
                );

                Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                viewIntent.setDataAndType(uri, "application/pdf");
                viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                viewIntent.addFlags(Intent.FLAG_ACTIVITY_NO_HISTORY);

                Intent chooser = Intent.createChooser(viewIntent, "Open or Print PDF");
                activity.startActivity(chooser);

                Toast.makeText(activity, "Saved to Downloads: " + fileName, Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                e.printStackTrace();
                Toast.makeText(activity, "Failed to open PDF: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private File writeBase64ToCache(String base64Data, String fileName) {
        try {
            if (base64Data.contains(",")) {
                base64Data = base64Data.split(",")[1];
            }
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            File cacheDir = new File(activity.getCacheDir(), "documents");
            if (!cacheDir.exists()) {
                cacheDir.mkdirs();
            }
            File outFile = new File(cacheDir, fileName != null ? fileName : "document.pdf");
            try (FileOutputStream fos = new FileOutputStream(outFile)) {
                fos.write(bytes);
                fos.flush();
            }
            return outFile;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    private void saveToDownloads(File pdfFile, String fileName) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                values.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                Uri uri = activity.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri != null) {
                    try (OutputStream out = activity.getContentResolver().openOutputStream(uri);
                         InputStream in = new FileInputStream(pdfFile)) {
                        byte[] buf = new byte[8192];
                        int len;
                        while ((len = in.read(buf)) > 0) {
                            out.write(buf, 0, len);
                        }
                    }
                }
            } else {
                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!downloadsDir.exists()) downloadsDir.mkdirs();
                File dest = new File(downloadsDir, fileName);
                try (OutputStream out = new FileOutputStream(dest);
                     InputStream in = new FileInputStream(pdfFile)) {
                    byte[] buf = new byte[8192];
                    int len;
                    while ((len = in.read(buf)) > 0) {
                        out.write(buf, 0, len);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
