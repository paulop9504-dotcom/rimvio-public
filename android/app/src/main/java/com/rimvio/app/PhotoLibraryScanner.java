package com.rimvio.app;

import android.content.ContentUris;
import android.content.Context;
import android.database.Cursor;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import androidx.exifinterface.media.ExifInterface;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Locale;

public final class PhotoLibraryScanner {

  private PhotoLibraryScanner() {}

  public static String getNetworkType(Context context) {
    ConnectivityManager cm =
        (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
    if (cm == null) {
      return "unknown";
    }
    Network network = cm.getActiveNetwork();
    if (network == null) {
      return "none";
    }
    NetworkCapabilities caps = cm.getNetworkCapabilities(network);
    if (caps == null) {
      return "unknown";
    }
    if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
      return "wifi";
    }
    if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
      return "cellular";
    }
    return "unknown";
  }

  public static JSObject scan(Context context, long sinceMs, int limit, int windowDays) {
    long nowMs = System.currentTimeMillis();
    long windowStartMs = nowMs - (long) windowDays * 86_400_000L;
    long effectiveSinceMs = Math.max(sinceMs, windowStartMs);
    long effectiveSinceSec = effectiveSinceMs / 1000L;

    JSArray photos = new JSArray();
    long maxCapturedMs = effectiveSinceMs;

    maxCapturedMs =
        Math.max(
            maxCapturedMs,
            scanCollection(
                context,
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                "photo",
                effectiveSinceSec,
                limit,
                photos));
    if (photos.length() < limit) {
      maxCapturedMs =
          Math.max(
              maxCapturedMs,
              scanCollection(
                  context,
                  MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                  "video",
                  effectiveSinceSec,
                  limit - photos.length(),
                  photos));
    }

    JSObject ret = new JSObject();
    ret.put("photos", photos);
    ret.put("nextCursorMs", maxCapturedMs);
    return ret;
  }

  private static long scanCollection(
      Context context,
      Uri collection,
      String mediaKind,
      long sinceSec,
      int limit,
      JSArray out) {
    long maxCapturedMs = sinceSec * 1000L;
    String[] projection = {
      MediaStore.MediaColumns._ID,
      MediaStore.MediaColumns.DISPLAY_NAME,
      MediaStore.MediaColumns.MIME_TYPE,
      MediaStore.MediaColumns.DATE_ADDED,
      MediaStore.MediaColumns.SIZE,
    };

    String selection = MediaStore.MediaColumns.DATE_ADDED + " >= ?";
    String[] selectionArgs = new String[] {String.valueOf(sinceSec)};
    String sortOrder = MediaStore.MediaColumns.DATE_ADDED + " ASC";

    try (Cursor cursor =
        context
            .getContentResolver()
            .query(collection, projection, selection, selectionArgs, sortOrder)) {
      if (cursor == null) {
        return maxCapturedMs;
      }

      int idIndex = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID);
      int nameIndex = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME);
      int mimeIndex = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.MIME_TYPE);
      int addedIndex = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_ADDED);

      while (cursor.moveToNext() && out.length() < limit) {
        long id = cursor.getLong(idIndex);
        Uri contentUri = ContentUris.withAppendedId(collection, id);
        String fileName = cursor.getString(nameIndex);
        String mimeType = cursor.getString(mimeIndex);
        long addedSec = cursor.getLong(addedIndex);
        long capturedAtMs = addedSec * 1000L;

        JSObject item = new JSObject();
        item.put("id", String.valueOf(id));
        item.put("contentUri", contentUri.toString());
        item.put("fileName", fileName != null ? fileName : ("media-" + id));
        item.put("mimeType", mimeType != null ? mimeType : "image/jpeg");
        item.put("capturedAtMs", capturedAtMs);
        item.put("mediaKind", mediaKind);

        float[] latLng = readLatLng(context, contentUri);
        if (latLng != null) {
          item.put("lat", latLng[0]);
          item.put("lng", latLng[1]);
        } else {
          item.put("lat", null);
          item.put("lng", null);
        }

        out.put(item);
        maxCapturedMs = Math.max(maxCapturedMs, capturedAtMs);
      }
    } catch (Exception ignored) {
      // best-effort scan
    }

    return maxCapturedMs;
  }

  private static float[] readLatLng(Context context, Uri contentUri) {
    try (InputStream in = context.getContentResolver().openInputStream(contentUri)) {
      if (in == null) {
        return null;
      }
      ExifInterface exif = new ExifInterface(in);
      float[] latlong = new float[2];
      if (exif.getLatLong(latlong)) {
        return latlong;
      }
    } catch (Exception ignored) {
      // ignore missing EXIF GPS
    }
    return null;
  }

  public static JSObject importToCache(Context context, String contentUriValue, String fileName)
      throws Exception {
    Uri uri = Uri.parse(contentUriValue);
    String safeName = fileName != null ? fileName : "album-import.jpg";
    String ext = "";
    int dot = safeName.lastIndexOf('.');
    if (dot >= 0) {
      ext = safeName.substring(dot);
    }
    File outFile =
        new File(
            context.getCacheDir(),
            "album-sync-" + System.currentTimeMillis() + ext.toLowerCase(Locale.US));

    try (InputStream in = context.getContentResolver().openInputStream(uri);
        OutputStream out = new FileOutputStream(outFile)) {
      if (in == null) {
        throw new IllegalStateException("cannot_open_uri");
      }
      byte[] buffer = new byte[8192];
      int read;
      while ((read = in.read(buffer)) != -1) {
        out.write(buffer, 0, read);
      }
    }

    String mimeType = context.getContentResolver().getType(uri);
    if (mimeType == null) {
      mimeType = "image/jpeg";
    }

    JSObject ret = new JSObject();
    ret.put("cachePath", outFile.getAbsolutePath());
    ret.put("fileName", safeName);
    ret.put("mimeType", mimeType);
    ret.put("sizeBytes", outFile.length());
    return ret;
  }

  public static String[] requiredPermissions() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return new String[] {
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.ACCESS_MEDIA_LOCATION",
      };
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      return new String[] {
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.ACCESS_MEDIA_LOCATION",
      };
    }
    return new String[] {"android.permission.READ_EXTERNAL_STORAGE"};
  }
}
