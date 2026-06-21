package com.dropzone.apextracker;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Native Android shell for the Dropzone dashboard.
 *
 * This keeps the experience inside the installed app instead of opening the user's browser.
 * Later, this screen can become fully native while the widget keeps using server summaries.
 */
public class MainActivity extends Activity {
    private static final String DASHBOARD_URL = "https://dropzone-apex-tracker.vercel.app";
    private WebView dashboardWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        dashboardWebView = findViewById(R.id.dashboard_web_view);
        WebSettings settings = dashboardWebView.getSettings();

        // The Next.js dashboard needs JavaScript and local storage for the roster UI.
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        dashboardWebView.setWebViewClient(new WebViewClient());
        dashboardWebView.loadUrl(DASHBOARD_URL);
    }

    @Override
    public void onBackPressed() {
        if (dashboardWebView != null && dashboardWebView.canGoBack()) {
            dashboardWebView.goBack();
            return;
        }

        super.onBackPressed();
    }
}
