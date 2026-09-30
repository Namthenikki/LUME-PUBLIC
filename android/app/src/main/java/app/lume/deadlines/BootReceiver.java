package app.lume.deadlines;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Alarms don't survive a reboot or an app update on Android; put them back and refresh them. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Context app = context.getApplicationContext();
        Alarms.restore(app);
        SyncWorker.enqueue(app);
    }
}
