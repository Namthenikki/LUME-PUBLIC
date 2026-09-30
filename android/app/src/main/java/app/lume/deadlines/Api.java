package app.lume.deadlines;

import android.content.Context;
import android.net.Uri;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

/** Talks to the Lume server this app was built for. */
final class Api {
    private Api() {}

    static final String ORIGIN = BuildConfig.LUME_ORIGIN;

    /** The alarm and reminder schedule from /api/alarms. */
    static final class Schedule {
        final JSONArray alarms;
        final Set<String> pendingTaskIds;

        Schedule(JSONArray alarms, Set<String> pendingTaskIds) {
            this.alarms = alarms;
            this.pendingTaskIds = pendingTaskIds;
        }
    }

    /** Returns null if this phone isn't paired yet (401). Throws if Lume can't be reached. */
    static Schedule fetchSchedule(Context c, int timeoutMs) throws IOException, JSONException {
        HttpURLConnection con = (HttpURLConnection) new URL(ORIGIN + "/api/alarms").openConnection();
        con.setConnectTimeout(timeoutMs);
        con.setReadTimeout(timeoutMs);
        con.setRequestProperty("Authorization", "Bearer " + Device.token(c));
        // This app shows reminders itself, so Lume sends them here instead of as web pushes.
        con.setRequestProperty("X-Lume-Reminders", "1");
        try {
            int code = con.getResponseCode();
            if (code == 401) return null;
            if (code != 200) throw new IOException("Lume answered HTTP " + code);
            JSONObject body = new JSONObject(read(con.getInputStream()));
            JSONArray ids = body.optJSONArray("pendingTaskIds");
            Set<String> pending = new HashSet<>();
            for (int i = 0; ids != null && i < ids.length(); i++) pending.add(ids.getString(i));
            return new Schedule(body.getJSONArray("alarms"), pending);
        } finally {
            con.disconnect();
        }
    }

    /** "done" or "snooze" on a task, authorized by the task's token from the alarm feed. */
    static boolean postAction(String taskId, String action, String token) {
        try {
            HttpURLConnection con = (HttpURLConnection) new URL(ORIGIN + "/api/tasks/" + Uri.encode(taskId) + "/action").openConnection();
            con.setConnectTimeout(8000);
            con.setReadTimeout(8000);
            con.setRequestMethod("POST");
            con.setDoOutput(true);
            con.setRequestProperty("Content-Type", "application/json");
            byte[] payload = new JSONObject().put("action", action).put("token", token).toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream out = con.getOutputStream()) {
                out.write(payload);
            }
            int code = con.getResponseCode();
            con.disconnect();
            return code == 200;
        } catch (IOException | JSONException e) {
            return false;
        }
    }

    private static String read(InputStream in) throws IOException {
        try (InputStream stream = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            for (int n; (n = stream.read(buffer)) != -1; ) out.write(buffer, 0, n);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }
}
