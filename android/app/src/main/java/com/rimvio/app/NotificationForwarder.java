package com.rimvio.app;

import com.getcapacitor.JSObject;
import java.util.ArrayList;
import java.util.List;

/** Forwards NotificationListener events to the Capacitor plugin (with pending queue). */
public final class NotificationForwarder {

  public interface Listener {
    void onNotificationPosted(JSObject payload);
  }

  private static Listener listener;
  private static final List<JSObject> pending = new ArrayList<>();

  private NotificationForwarder() {}

  public static void setListener(Listener next) {
    listener = next;
    if (listener == null) {
      return;
    }
    synchronized (pending) {
      for (JSObject item : pending) {
        listener.onNotificationPosted(item);
      }
      pending.clear();
    }
  }

  public static void dispatch(JSObject payload) {
    Listener active = listener;
    if (active != null) {
      active.onNotificationPosted(payload);
      return;
    }
    synchronized (pending) {
      pending.add(payload);
      if (pending.size() > 100) {
        pending.remove(0);
      }
    }
  }
}
