package com.rimvio.app;

import android.content.Intent;
import android.text.TextUtils;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Routes Android ACTION_SEND → Rimvio /share web bridge (Capacitor WebView). */
public final class AndroidShareIntentRouter {

  private static final String DEFAULT_SERVER = "https://rimvio.app";
  private static final Pattern URL_PATTERN =
      Pattern.compile("(https?://[^\\s]+)", Pattern.CASE_INSENSITIVE);

  private static volatile String pendingShareUrl;

  private AndroidShareIntentRouter() {}

  public static void captureIntent(Intent intent) {
    if (intent == null) {
      return;
    }
    String action = intent.getAction();
    if (!Intent.ACTION_SEND.equals(action)) {
      return;
    }

    String type = intent.getType();
    if (type == null) {
      return;
    }

    if (type.startsWith("text/")) {
      String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
      String title = intent.getStringExtra(Intent.EXTRA_SUBJECT);
      String url = extractUrl(sharedText);
      pendingShareUrl = buildShareUrl(DEFAULT_SERVER, url, sharedText, title);
      return;
    }

    if (type.startsWith("image/") || type.startsWith("video/")) {
      pendingShareUrl = DEFAULT_SERVER.replaceAll("/$", "") + "/globe";
    }
  }

  public static boolean flushPendingShare(com.getcapacitor.Bridge bridge, String serverUrl) {
    String target = pendingShareUrl;
    if (TextUtils.isEmpty(target) || bridge == null || bridge.getWebView() == null) {
      return false;
    }
    pendingShareUrl = null;

    String base = TextUtils.isEmpty(serverUrl) ? DEFAULT_SERVER : serverUrl.replaceAll("/$", "");
    if (target.startsWith("http://") || target.startsWith("https://")) {
      bridge.getWebView().loadUrl(target);
      return true;
    }
    bridge.getWebView().loadUrl(base + target);
    return true;
  }

  public static String resolveServerUrl(com.getcapacitor.Bridge bridge) {
    if (bridge != null) {
      String configured = bridge.getServerUrl();
      if (!TextUtils.isEmpty(configured)) {
        return configured.replaceAll("/$", "");
      }
    }
    return DEFAULT_SERVER;
  }

  static String buildShareUrl(
      String server, String url, String text, String title) {
    StringBuilder query = new StringBuilder();
    appendQuery(query, "url", url);
    appendQuery(query, "text", text);
    appendQuery(query, "title", title);
    return server.replaceAll("/$", "") + "/share?" + query;
  }

  private static void appendQuery(StringBuilder query, String key, String value) {
    if (TextUtils.isEmpty(value)) {
      return;
    }
    if (query.length() > 0) {
      query.append("&");
    }
    query.append(key).append("=").append(encode(value));
  }

  private static String extractUrl(String text) {
    if (TextUtils.isEmpty(text)) {
      return null;
    }
    Matcher matcher = URL_PATTERN.matcher(text.trim());
    if (matcher.find()) {
      return matcher.group(1);
    }
    return null;
  }

  private static String encode(String value) {
    try {
      return URLEncoder.encode(value, "UTF-8");
    } catch (UnsupportedEncodingException error) {
      return value;
    }
  }
}
