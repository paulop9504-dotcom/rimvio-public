package com.rimvio.app;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import com.getcapacitor.JSObject;
import java.time.Instant;

/** Android Notification Listener — feeds Action OS shadow ingest on the JS layer. */
public class RimvioNotificationListenerService extends NotificationListenerService {

  @Override
  public void onNotificationPosted(StatusBarNotification sbn) {
    if (sbn == null) {
      return;
    }
    Notification notification = sbn.getNotification();
    if (notification == null) {
      return;
    }
    Bundle extras = notification.extras;
    if (extras == null) {
      return;
    }

    CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE, "");
    CharSequence text = extras.getCharSequence(Notification.EXTRA_TEXT, "");
    CharSequence bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT, "");
    String body =
        text != null && text.length() > 0
            ? text.toString()
            : bigText != null ? bigText.toString() : "";

    JSObject payload = new JSObject();
    payload.put(
        "source_app",
        sbn.getPackageName() != null ? sbn.getPackageName() : "unknown");
    payload.put("title", title != null ? title.toString() : "");
    payload.put("content", body);
    payload.put("timestamp", Instant.now().toString());
    NotificationForwarder.dispatch(payload);
  }
}
