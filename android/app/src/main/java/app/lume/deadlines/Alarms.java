package app.lume.deadlines;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;

/**
 * Deadline alarms. Each one is an exact alarm-clock alarm; when it goes off, an insistent alarm
 * notification rings (alarm sound on the alarm volume, repeating) until it's marked done or snoozed.
 * On a locked phone it opens the full-screen alarm screen.
 */
final class Alarms {
    private Alarms() {}

    static final String CHANNEL = "deadline_alarms";
    static final String EXTRA = "alarm";
    static final long SNOOZE_MS = 10 * 60_000L;
    /** Sleep time in IST: nothing rings (matches lib/quiet.ts on the server). */
    static final int QUIET_START_HOUR = 0;
    static final int QUIET_END_HOUR = 8;

    static boolean isQuietNow() {
        int hour = java.util.Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata")).get(java.util.Calendar.HOUR_OF_DAY);
        return hour >= QUIET_START_HOUR && hour < QUIET_END_HOUR;
    }

    static void ensureChannel(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL, c.getString(R.string.alarm_channel), NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription(c.getString(R.string.alarm_channel_description));
        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        channel.setSound(sound, new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[]{0, 900, 500, 900, 500, 900});
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.setBypassDnd(true);
        nm.createNotificationChannel(channel);
    }

    /* Scheduling */

    /**
     * Replaces the scheduled alarms with the server's list. Local snoozes survive while their task
     * is still pending.
     */
    static synchronized void replaceAll(Context c, JSONArray fromServer, Set<String> pendingTaskIds) {
        JSONArray old = scheduled(c);
        JSONArray next = new JSONArray();
        long now = System.currentTimeMillis();
        for (int i = 0; i < old.length(); i++) {
            JSONObject a = old.optJSONObject(i);
            if (a == null) continue;
            cancel(c, a.optString("id"));
            boolean snooze = a.optString("id").endsWith(":snooze");
            if (snooze && a.optLong("at") > now && pendingTaskIds.contains(a.optString("taskId"))) next.put(a);
        }
        for (int i = 0; i < fromServer.length(); i++) {
            JSONObject a = fromServer.optJSONObject(i);
            if (a != null) next.put(a);
        }
        for (int i = 0; i < next.length(); i++) schedule(c, next.optJSONObject(i));
        save(c, next);
    }

    /** After a reboot or an app update: put back everything that hasn't gone off yet. */
    static synchronized void restore(Context c) {
        JSONArray all = scheduled(c);
        for (int i = 0; i < all.length(); i++) schedule(c, all.optJSONObject(i));
    }

    static synchronized void snooze(Context c, JSONObject alarm) {
        try {
            JSONObject s = new JSONObject(alarm.toString());
            s.put("id", alarm.optString("taskId") + ":snooze");
            s.put("at", System.currentTimeMillis() + SNOOZE_MS);
            JSONArray all = scheduled(c);
            JSONArray next = new JSONArray();
            for (int i = 0; i < all.length(); i++) {
                JSONObject a = all.optJSONObject(i);
                if (a != null && !a.optString("id").equals(s.optString("id"))) next.put(a);
            }
            next.put(s);
            schedule(c, s);
            save(c, next);
        } catch (JSONException ignored) {
            // the alarm came from our own JSON; nothing to recover
        }
    }

    /** Cancels every alarm left for a task, e.g. after it's marked done. */
    static synchronized void cancelTask(Context c, String taskId) {
        JSONArray all = scheduled(c);
        JSONArray keep = new JSONArray();
        for (int i = 0; i < all.length(); i++) {
            JSONObject a = all.optJSONObject(i);
            if (a == null) continue;
            if (taskId.equals(a.optString("taskId"))) cancel(c, a.optString("id"));
            else keep.put(a);
        }
        save(c, keep);
    }

    /** An alarm that isn't kept for restores or syncs (the test alarm). */
    static void scheduleOnce(Context c, JSONObject a) {
        schedule(c, a);
    }

    private static void schedule(Context c, JSONObject a) {
        if (a == null) return;
        long at = a.optLong("at");
        if (at <= System.currentTimeMillis()) return;
        AlarmManager am = c.getSystemService(AlarmManager.class);
        PendingIntent fire = firing(c, a.optString("id"), a.toString());
        if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, fire);
            return;
        }
        PendingIntent show = PendingIntent.getActivity(c, 0, new Intent(c, LumeLauncherActivity.class), PendingIntent.FLAG_IMMUTABLE);
        am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), fire);
    }

    private static void cancel(Context c, String id) {
        c.getSystemService(AlarmManager.class).cancel(firing(c, id, null));
    }

    /** One PendingIntent per alarm id; the data URI keeps them apart. */
    private static PendingIntent firing(Context c, String id, String json) {
        Intent i = new Intent(c, AlarmReceiver.class).setData(Uri.parse("lume://alarm/" + Uri.encode(id)));
        if (json != null) i.putExtra(EXTRA, json);
        return PendingIntent.getBroadcast(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static JSONArray scheduled(Context c) {
        try {
            return new JSONArray(Device.prefs(c).getString("scheduled", "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    private static void save(Context c, JSONArray alarms) {
        Device.prefs(c).edit().putString("scheduled", alarms.toString()).apply();
    }

    /* Ringing */

    static int notificationId(String taskId) {
        return ("alarm:" + taskId).hashCode();
    }

    static void ring(Context c, JSONObject a) {
        ensureChannel(c);
        String taskId = a.optString("taskId");
        long dueAt = a.optLong("dueAt");

        Intent full = new Intent(c, AlarmActivity.class)
                .putExtra(EXTRA, a.toString())
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        PendingIntent fullScreen = PendingIntent.getActivity(c, notificationId(taskId), full,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification n = new NotificationCompat.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_lume)
                .setColor(ContextCompat.getColor(c, R.color.blue))
                .setContentTitle(timeLeft(dueAt) + " left: " + a.optString("title"))
                .setContentText(a.optString("course") + ". Due " + timeIST(dueAt) + ".")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setFullScreenIntent(fullScreen, true)
                .setContentIntent(fullScreen)
                .addAction(0, c.getString(R.string.mark_done), ActionReceiver.pending(c, ActionReceiver.DONE, a))
                .addAction(0, c.getString(R.string.snooze), ActionReceiver.pending(c, ActionReceiver.SNOOZE, a))
                .build();
        n.flags |= Notification.FLAG_INSISTENT; // keeps ringing until it's handled

        if (Build.VERSION.SDK_INT < 33
                || ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            NotificationManagerCompat.from(c).notify(notificationId(taskId), n);
        }
    }

    /** Silences a ringing alarm. */
    static void stop(Context c, String taskId) {
        NotificationManagerCompat.from(c).cancel(notificationId(taskId));
    }

    /** "10 minutes", or whole hours from 90 minutes on ("6 hours", "12 hours"). */
    static String timeLeft(long dueAt) {
        long minutes = Math.max(0, Math.round((dueAt - System.currentTimeMillis()) / 60_000.0));
        if (minutes < 90) return minutes + (minutes == 1 ? " minute" : " minutes");
        return Math.round(minutes / 60.0) + " hours";
    }

    static String timeIST(long ms) {
        SimpleDateFormat f = new SimpleDateFormat("EEE d MMM, h:mm a", Locale.ENGLISH);
        f.setTimeZone(TimeZone.getTimeZone("Asia/Kolkata"));
        return f.format(new Date(ms));
    }
}
