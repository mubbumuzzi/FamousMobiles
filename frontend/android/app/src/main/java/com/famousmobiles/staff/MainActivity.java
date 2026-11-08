package com.famousmobiles.staff;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureWebView();
    }

    private void configureWebView() {
        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                settings.setDomStorageEnabled(true);
                settings.setLoadsImagesAutomatically(true);
                settings.setBlockNetworkImage(false);
                settings.setBlockNetworkLoads(false);
                settings.setAllowFileAccess(false);
                settings.setAllowContentAccess(true);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
