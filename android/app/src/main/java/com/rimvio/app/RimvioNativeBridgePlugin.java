package com.rimvio.app;

import android.Manifest;
import android.content.Intent;
import android.database.ContentObserver;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.provider.Settings;
import android.text.TextUtils;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
  name = "RimvioNativeBridge",
  permissions = {
    @Permission(
      alias = "photos",
      strings = {
        Manifest.permission.READ_MEDIA_IMAGES,
        Manifest.permission.READ_MEDIA_VIDEO,
      }),
    @Permission(
      alias = "storage",
      strings = {Manifest.permission.READ_EXTERNAL_STORAGE}),
    @Permission(
      alias = "mediaLocation",
      strings = {Manifest.permission.ACCESS_MEDIA_LOCATION}),
  })
public class RimvioNativeBridgePlugin extends Plugin implements NotificationForwarder.Listener {

  private static final String PHOTO_PERMISSION_CALLBACK = "photoPermissionCallback";
  private ContentObserver photoObserver;

  @Override
  public void load() {
    NotificationForwarder.setListener(this);
    photoObserver =
        new ContentObserver(new Handler(Looper.getMainLooper())) {
          @Override
          public void onChange(boolean selfChange) {
            JSObject payload = new JSObject();
            payload.put("timestamp", System.currentTimeMillis());
            notifyListeners("photoLibraryChanged", payload);
          }
        };
    getContext()
        .getContentResolver()
        .registerContentObserver(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI, true, photoObserver);
    getContext()
        .getContentResolver()
        .registerContentObserver(
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI, true, photoObserver);
  }

  @Override
  protected void handleOnDestroy() {
    if (photoObserver != null) {
      getContext().getContentResolver().unregisterContentObserver(photoObserver);
      photoObserver = null;
    }
    NotificationForwarder.setListener(null);
    super.handleOnDestroy();
  }

  @Override
  public void onNotificationPosted(JSObject payload) {
    notifyListeners("notificationPosted", payload);
  }

  @PluginMethod
  public void isNotificationAccessEnabled(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("enabled", isNotificationListenerEnabled());
    call.resolve(ret);
  }

  @PluginMethod
  public void openNotificationAccessSettings(PluginCall call) {
    Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getContext().startActivity(intent);
    call.resolve();
  }

  @PluginMethod
  public void getPlatformInfo(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("platform", "android");
    ret.put("isNative", true);
    call.resolve(ret);
  }

  @PluginMethod
  public void getNetworkType(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("type", PhotoLibraryScanner.getNetworkType(getContext()));
    call.resolve(ret);
  }

  @PluginMethod
  public void requestPhotoLibraryPermission(PluginCall call) {
    if (hasPhotoLibraryPermissions()) {
      JSObject ret = new JSObject();
      ret.put("granted", true);
      call.resolve(ret);
      return;
    }
    requestPermissionForAliases(getRequiredPermissionAliases(), call, PHOTO_PERMISSION_CALLBACK);
  }

  @PermissionCallback
  private void photoPermissionCallback(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("granted", hasPhotoLibraryPermissions());
    call.resolve(ret);
  }

  @PluginMethod
  public void scanPhotoLibrary(PluginCall call) {
    long sinceMs = call.getLong("sinceMs", 0L);
    int limit = call.getInt("limit", 40);
    int windowDays = call.getInt("windowDays", 7);
    call.resolve(PhotoLibraryScanner.scan(getContext(), sinceMs, limit, windowDays));
  }

  @PluginMethod
  public void importPhotoToCache(PluginCall call) {
    String contentUri = call.getString("contentUri");
    if (TextUtils.isEmpty(contentUri)) {
      call.reject("missing_content_uri");
      return;
    }
    String fileName = call.getString("fileName", "album-import.jpg");
    try {
      call.resolve(PhotoLibraryScanner.importToCache(getContext(), contentUri, fileName));
    } catch (Exception error) {
      call.reject("import_failed", error);
    }
  }

  private String[] getRequiredPermissionAliases() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return new String[] {"photos", "mediaLocation"};
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      return new String[] {"storage", "mediaLocation"};
    }
    return new String[] {"storage"};
  }

  private boolean hasPhotoLibraryPermissions() {
    for (String alias : getRequiredPermissionAliases()) {
      if (getPermissionState(alias) != PermissionState.GRANTED) {
        return false;
      }
    }
    return true;
  }

  private boolean isNotificationListenerEnabled() {
    String pkgName = getContext().getPackageName();
    String flat =
        Settings.Secure.getString(
            getContext().getContentResolver(), "enabled_notification_listeners");
    if (TextUtils.isEmpty(flat)) {
      return false;
    }
    String[] names = flat.split(":");
    for (String name : names) {
      if (name != null && name.contains(pkgName)) {
        return true;
      }
    }
    return false;
  }
}
