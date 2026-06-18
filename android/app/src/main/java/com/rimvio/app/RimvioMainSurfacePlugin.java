package com.rimvio.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.os.Build;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "RimvioMainSurface")
public class RimvioMainSurfacePlugin extends Plugin {

  private static final String CHANNEL_ID = "rimvio_main_surface";
  private static final int NOTIFICATION_ID = 91001;
  private float savedBrightness = -1f;
  private boolean foregroundScanActive = false;
  private boolean backgroundScanPreferred = false;

  @Override
  public void load() {
    ensureChannel();
  }

  private void ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }
    NotificationManager manager =
        (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager == null) {
      return;
    }
    NotificationChannel channel =
        new NotificationChannel(
            CHANNEL_ID, "지금", NotificationManager.IMPORTANCE_HIGH);
    channel.setDescription("티켓 · QR");
    channel.enableLights(true);
    channel.setLightColor(Color.WHITE);
    manager.createNotificationChannel(channel);
  }

  @PluginMethod
  public void syncMainSurface(PluginCall call) {
    JSObject command = call.getObject("command");
    if (command == null) {
      call.reject("missing_command");
      return;
    }

    String lifecycle = command.getString("lifecycle", "end");
    JSObject payload = command.getJSObject("payload");

    if ("end".equals(lifecycle) || payload == null) {
      backgroundScanPreferred = false;
      clearSurface();
      JSObject result = new JSObject();
      result.put("ok", true);
      result.put("platform", "android");
      result.put("lifecycle", "end");
      call.resolve(result);
      return;
    }

    String eyebrow = payload.getString("eyebrowKo", "지금");
    String label = payload.getString("labelKo", "티켓");
    String cta = payload.getString("ctaLabelKo", "열기");
    String place = payload.getString("contextPlace", "");
    String qrImageSrc = payload.getString("qrImageSrc", null);
    backgroundScanPreferred = payload.getBoolean("preferScanBrightness", false);

    showOngoingNotification(eyebrow, label, cta, place, qrImageSrc);
    refreshScanBrightness();

    JSObject result = new JSObject();
    result.put("ok", true);
    result.put("platform", "android");
    result.put("lifecycle", lifecycle);
    result.put("note", "android_ongoing_posted");
    call.resolve(result);
  }

  @PluginMethod
  public void endAllMainSurfaces(PluginCall call) {
    backgroundScanPreferred = false;
    clearSurface();
    JSObject result = new JSObject();
    result.put("ok", true);
    call.resolve(result);
  }

  @PluginMethod
  public void setScanBrightnessEnabled(PluginCall call) {
    foregroundScanActive = call.getBoolean("enabled", false);
    refreshScanBrightness();
    JSObject result = new JSObject();
    result.put("ok", true);
    call.resolve(result);
  }

  private void showOngoingNotification(
      String eyebrow, String label, String cta, String place, String qrImageSrc) {
    Context context = getContext();
    Intent launch = new Intent(context, MainActivity.class);
    launch.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent pending =
        PendingIntent.getActivity(
            context,
            0,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    String body = place != null && !place.isEmpty() ? place : cta;
    NotificationCompat.Builder builder =
        new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_myplaces)
            .setContentTitle(eyebrow + " · " + label)
            .setContentText(body)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setContentIntent(pending);

    Bitmap qrBitmap = MainSurfaceQrBitmap.decode(qrImageSrc);
    if (qrBitmap != null) {
      builder
          .setLargeIcon(qrBitmap)
          .setStyle(
              new NotificationCompat.BigPictureStyle()
                  .bigPicture(qrBitmap)
                  .bigLargeIcon((Bitmap) null));
    } else {
      builder.setStyle(new NotificationCompat.BigTextStyle().bigText(label + "\n" + body));
    }

    Notification notification = builder.build();

    NotificationManager manager =
        (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager != null) {
      manager.notify(NOTIFICATION_ID, notification);
    }
  }

  private void clearSurface() {
    NotificationManager manager =
        (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager != null) {
      manager.cancel(NOTIFICATION_ID);
    }
    refreshScanBrightness();
  }

  private void refreshScanBrightness() {
    applyScanBrightness(foregroundScanActive || backgroundScanPreferred);
  }

  private void applyScanBrightness(boolean enable) {
    if (getActivity() == null) {
      return;
    }
    Window window = getActivity().getWindow();
    WindowManager.LayoutParams params = window.getAttributes();
    if (enable) {
      if (savedBrightness < 0f) {
        savedBrightness = params.screenBrightness;
      }
      params.screenBrightness = 1f;
    } else {
      if (savedBrightness >= 0f) {
        params.screenBrightness = savedBrightness;
      } else {
        params.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
      }
      savedBrightness = -1f;
    }
    window.setAttributes(params);
  }
}
