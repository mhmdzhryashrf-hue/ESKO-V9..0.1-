package com.esko.openhub;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends Activity {
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String LOCAL_START_URL = "https://appassets.androidplatform.net/assets/www/index.html";
    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private Uri remoteSite;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        setContentView(webView);
        configureOptionalRemoteSite();

        CookieManager.getInstance().setAcceptCookie(true);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setLoadsImagesAutomatically(true);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isLocalAsset(uri)) return assetLoader.shouldInterceptRequest(uri);
                return null;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return routeUrl(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return routeUrl(Uri.parse(url));
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(remoteSite == null ? LOCAL_START_URL : remoteSite.toString());
        }
    }

    private void configureOptionalRemoteSite() {
        String value = BuildConfig.ESKO_SITE_URL == null ? "" : BuildConfig.ESKO_SITE_URL.trim();
        if (value.isEmpty()) return;
        try {
            Uri candidate = Uri.parse(value);
            if ("https".equalsIgnoreCase(candidate.getScheme())
                    && candidate.getHost() != null
                    && candidate.getUserInfo() == null
                    && candidate.getQuery() == null
                    && candidate.getFragment() == null
                    && (candidate.getPort() == -1 || candidate.getPort() == 443)) {
                remoteSite = candidate;
            }
        } catch (Exception ignored) {
            remoteSite = null;
        }
    }

    private boolean isLocalAsset(Uri uri) {
        return uri != null && "https".equalsIgnoreCase(uri.getScheme())
                && APP_HOST.equalsIgnoreCase(uri.getHost())
                && (uri.getPort() == -1 || uri.getPort() == 443)
                && uri.getPath() != null && uri.getPath().startsWith("/assets/");
    }

    private boolean sameRemoteOrigin(Uri uri) {
        if (remoteSite == null || uri == null) return false;
        int remotePort = remoteSite.getPort() > 0 ? remoteSite.getPort() : 443;
        int requestPort = uri.getPort() > 0 ? uri.getPort() : 443;
        return "https".equalsIgnoreCase(uri.getScheme())
                && remoteSite.getHost().equalsIgnoreCase(uri.getHost())
                && remotePort == requestPort;
    }

    private boolean routeUrl(Uri uri) {
        if (uri == null) return true;
        if (isLocalAsset(uri) || sameRemoteOrigin(uri)) return false;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        if (scheme.equals("https") || scheme.equals("http") || scheme.equals("mailto") || scheme.equals("tel")) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
        }
        return true;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
