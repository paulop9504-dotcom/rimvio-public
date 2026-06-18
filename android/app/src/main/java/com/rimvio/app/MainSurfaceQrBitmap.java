package com.rimvio.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

/** Decode QR image for ongoing notification BigPicture style. */
public final class MainSurfaceQrBitmap {

  private MainSurfaceQrBitmap() {}

  public static Bitmap decode(String src) {
    if (src == null || src.isEmpty()) {
      return null;
    }
    String trimmed = src.trim();
    if (!trimmed.startsWith("data:image")) {
      return null;
    }
    int comma = trimmed.indexOf(',');
    if (comma < 0 || comma >= trimmed.length() - 1) {
      return null;
    }
    try {
      byte[] bytes = Base64.decode(trimmed.substring(comma + 1), Base64.DEFAULT);
      return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
    } catch (IllegalArgumentException ex) {
      return null;
    }
  }
}
