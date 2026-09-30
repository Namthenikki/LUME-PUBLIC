package app.lume.deadlines;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

/**
 * Deadline reminders ("6 hours left", "Due today", ...) as ordinary notifications. They come in the
 * alarm schedule with kind "reminder" and are set like the alarms, so they show at their exact minute
 * even when the phone is asleep or offline, instead of waiting for a web push.
 */
final class Reminders {
    private Reminders() {}

    static final String CHANNEL = "deadline_reminders";

    static boolean isReminder(JSONObject a) {
        return "reminder".equals(a.optString("kind"));
    }

    static int notificationId(String taskId) {
        return ("reminder:" + taskId).hashCode();
    }

    static void ensureChannel(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL, c.getString(R.string.reminder_channel), NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription(c.getString(R.string.reminder_channel_description));
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(channel);
    }

    static void show(Context c, JSONObject r) {
        ensureChannel(c);
        String taskId = r.optString("taskId");
        PendingIntent open = PendingIntent.getActivity(c, notificationId(taskId),
                new Intent(c, LumeLauncherActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder n = new NotificationCompat.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_lume)
                .setColor(ContextCompat.getColor(c, R.color.blue))
                .setContentTitle(r.optString("title"))
                .setContentText(r.optString("body"))
                .setStyle(new NotificationCompat.BigTextStyle().bigText(r.optString("body")))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setSilent(Alarms.isQuietNow()) // 12 AM to 8 AM: shown, but no sound or vibration
                .setAutoCancel(true)
                .setContentIntent(open)
                .addAction(0, c.getString(R.string.mark_done), ActionReceiver.pending(c, ActionReceiver.DONE, r));
        if (r.optLong("dueAt") > System.currentTimeMillis()) {
            n.addAction(0, c.getString(R.string.remind_later), ActionReceiver.pending(c, ActionReceiver.REMIND_LATER, r));
        }

        if (Build.VERSION.SDK_INT < 33
                || ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            try {
                NotificationManagerCompat.from(c).notify(notificationId(taskId), n.build());
            } catch (SecurityException ignored) {
                // notification permission was revoked
            }
        }
    }

    static void cancel(Context c, String taskId) {
        NotificationManagerCompat.from(c).cancel(notificationId(taskId));
    }
}
