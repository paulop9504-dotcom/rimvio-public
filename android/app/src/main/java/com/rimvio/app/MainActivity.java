package com.rimvio.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(RimvioNativeBridgePlugin.class);
    registerPlugin(RimvioMainSurfacePlugin.class);
    super.onCreate(savedInstanceState);
    AndroidShareIntentRouter.captureIntent(getIntent());
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    AndroidShareIntentRouter.captureIntent(intent);
    flushPendingShareRoute();
  }

  @Override
  public void onResume() {
    super.onResume();
    flushPendingShareRoute();
  }

  private void flushPendingShareRoute() {
    if (getBridge() == null) {
      return;
    }
    String server = AndroidShareIntentRouter.resolveServerUrl(getBridge());
    AndroidShareIntentRouter.flushPendingShare(getBridge(), server);
  }
}
