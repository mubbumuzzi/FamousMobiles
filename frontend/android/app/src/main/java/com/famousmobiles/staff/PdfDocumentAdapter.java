package com.famousmobiles.staff;

import android.content.Context;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class PdfDocumentAdapter extends PrintDocumentAdapter {
    private final Context context;
    private final File pdfFile;

    public PdfDocumentAdapter(Context context, File pdfFile) {
        this.context = context;
        this.pdfFile = pdfFile;
    }

    @Override
    public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes,
                         CancellationSignal cancellationSignal, LayoutResultCallback callback,
                         Bundle extras) {
        if (cancellationSignal != null && cancellationSignal.isCanceled()) {
            callback.onLayoutCancelled();
            return;
        }

        PrintDocumentInfo info = new PrintDocumentInfo.Builder(pdfFile.getName())
                .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                .setPageCount(PrintDocumentInfo.PAGE_COUNT_UNKNOWN)
                .build();

        callback.onLayoutFinished(info, !newAttributes.equals(oldAttributes));
    }

    @Override
    public void onWrite(PageRange[] pages, ParcelFileDescriptor destination,
                        CancellationSignal cancellationSignal, WriteResultCallback callback) {
        InputStream input = null;
        OutputStream output = null;

        try {
            input = new FileInputStream(pdfFile);
            output = new FileOutputStream(destination.getFileDescriptor());

            byte[] buf = new byte[16384];
            int bytesRead;

            while ((bytesRead = input.read(buf)) >= 0) {
                if (cancellationSignal != null && cancellationSignal.isCanceled()) {
                    callback.onWriteCancelled();
                    return;
                }
                output.write(buf, 0, bytesRead);
            }

            if (cancellationSignal != null && cancellationSignal.isCanceled()) {
                callback.onWriteCancelled();
            } else {
                callback.onWriteFinished(new PageRange[]{PageRange.ALL_PAGES});
            }
        } catch (Exception e) {
            callback.onWriteFailed(e.getMessage());
        } finally {
            try {
                if (input != null) input.close();
                if (output != null) output.close();
            } catch (IOException ignored) {}
        }
    }
}
