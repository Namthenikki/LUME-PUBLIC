package app.lume.deadlines;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.SweepGradient;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.Interpolator;
import android.view.animation.OvershootInterpolator;
import android.view.animation.PathInterpolator;

/**
 * The startup animation: the mark's cyan dot shoots up, circles once to draw the ring, the stem
 * rises, and the dot settles on top with a soft pulse. It's drawn in @drawable/splash's own
 * coordinates (a 24-unit box, 96dp wide, centred on screen), so its last frame is exactly the
 * splash image the TWA shows next, and the hand-off doesn't jump.
 */
final class IntroView extends View {
    static final long DURATION = 1460;

    private static final int PANEL = 0xFFF3F3F5;
    private static final int INK = 0xFF0E0E11;
    private static final int CYAN = 0xFF22C1F1;
    // The freshly drawn ring, before it settles to ink: grey, then pale cyan at the dot.
    private static final int GREY = 0xFFA4A4AC;
    private static final int PALE = 0xFFA9E3F7;

    // The mark (@drawable/splash): ring centre (12, 13.2) r 8, stem 13.2 → 9.6, dot (12, 3.4) r 2.7.
    private static final float RING_Y = 13.2f, RING_R = 8f, STROKE = 2.6f;
    private static final float STEM_TOP = 9.6f, DOT_Y = 3.4f, DOT_R = 2.7f;
    private static final float TRAIL = 160f; // degrees of ring still settling behind the dot

    private static final Interpolator EASE = new PathInterpolator(0.45f, 0f, 0.25f, 1f);
    private static final Interpolator RISE = new DecelerateInterpolator(1.6f);
    private static final Interpolator STEM = new OvershootInterpolator(1.6f);
    private static final Interpolator LIFT = new OvershootInterpolator(2.4f);

    private final Paint ring = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint stem = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF oval = new RectF();
    private final Path tail = new Path();
    private final ValueAnimator clock = ValueAnimator.ofFloat(0f, DURATION);
    private final float unit;
    private float now; // ms into the animation

    IntroView(Context context, Runnable onFinished) {
        super(context);
        unit = 4 * getResources().getDisplayMetrics().density;
        ring.setStyle(Paint.Style.STROKE);
        ring.setStrokeWidth(STROKE * unit);
        stem.setStyle(Paint.Style.STROKE);
        stem.setStrokeWidth(STROKE * unit);
        stem.setStrokeCap(Paint.Cap.ROUND);
        stem.setColor(INK);

        clock.setDuration(DURATION);
        clock.setInterpolator(null); // linear: each phase eases itself
        clock.addUpdateListener(a -> {
            now = (float) a.getAnimatedValue();
            invalidate();
        });
        clock.addListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(Animator animation) {
                now = DURATION;
                invalidate();
                onFinished.run();
            }
        });
    }

    void play() {
        clock.start();
    }

    void stop() {
        clock.removeAllListeners();
        clock.cancel();
    }

    /** Progress 0..1 of the phase running from {@code from} to {@code to} ms. */
    private float phase(float from, float to) {
        return Math.max(0f, Math.min(1f, (now - from) / (to - from)));
    }

    @Override
    protected void onDraw(Canvas canvas) {
        canvas.drawColor(PANEL);
        float cx = getWidth() / 2f;
        float top = getHeight() / 2f - 12 * unit; // y of the mark box's top edge
        float ringY = top + RING_Y * unit, r = RING_R * unit;

        float rise = phase(0, 340), orbit = phase(340, 920), settle = phase(900, 1100);
        float grow = phase(760, 1000), lift = phase(920, 1180);

        // Soft halo and two ripples spreading from the ring as the dot lands.
        float halo = phase(980, 1400);
        if (halo > 0 && halo < 1) {
            float glow = (float) Math.sin(Math.PI * halo);
            fill.setShader(new RadialGradient(cx, ringY, 22 * unit,
                    new int[] {withAlpha(CYAN, 0.16f * glow), withAlpha(CYAN, 0)}, null, Shader.TileMode.CLAMP));
            canvas.drawCircle(cx, ringY, 22 * unit, fill);
            fill.setShader(null);
        }
        ripple(canvas, cx, ringY, phase(980, 1380));
        ripple(canvas, cx, ringY, phase(1080, 1460));

        // The ring, drawn behind the dot as it circles: pale where it has just passed, settling to ink.
        float sweep = 360 * EASE.getInterpolation(orbit);
        float trail = TRAIL * (1 - settle);
        oval.set(cx - r, ringY - r, cx + r, ringY + r);
        ring.setShader(null);
        ring.setColor(INK);
        if (trail < 1 && sweep >= 360) {
            canvas.drawCircle(cx, ringY, r, ring);
        } else if (sweep > 0.5f) {
            ring.setShader(trailShader(cx, ringY, sweep, Math.max(trail, 1)));
            canvas.drawArc(oval, -90, sweep, false, ring);
        }

        // The stem grows up from the ring's centre.
        if (grow > 0) {
            float g = STEM.getInterpolation(grow);
            stem.setAlpha(Math.round(255 * Math.min(1f, grow * 4)));
            canvas.drawLine(cx, ringY, cx, ringY - (RING_Y - STEM_TOP) * unit * g, stem);
        }

        // The dot: shoots up through the ring, circles it, then lifts to its place on top.
        float dotR = DOT_R * unit, x, y;
        if (orbit <= 0) {
            float p = RISE.getInterpolation(rise);
            x = cx;
            y = ringY + r - 2 * r * p;
            float length = 10 * unit * (1 - p) * Math.min(1f, rise * 6);
            if (length > 1) {
                tail.rewind();
                tail.moveTo(x - dotR * 0.9f, y);
                tail.lineTo(x + dotR * 0.9f, y);
                tail.lineTo(x + dotR * 0.2f, y + length);
                tail.lineTo(x - dotR * 0.2f, y + length);
                tail.close();
                fill.setShader(new LinearGradient(x, y, x, y + length,
                        withAlpha(CYAN, 0.55f), withAlpha(CYAN, 0), Shader.TileMode.CLAMP));
                canvas.drawPath(tail, fill);
                fill.setShader(null);
            }
            dotR *= 0.55f + 0.45f * Math.min(1f, rise * 3);
        } else {
            double angle = Math.toRadians(-90 + sweep);
            x = cx + r * (float) Math.cos(angle);
            y = ringY + r * (float) Math.sin(angle) - (RING_Y - RING_R - DOT_Y) * unit * LIFT.getInterpolation(lift);
        }

        // A cyan glow travels with the dot and pulses once as it lands.
        float glow = 0.22f * Math.min(1f, orbit * 5) * Math.min(1f, (1 - orbit) * 4);
        float land = phase(920, 1380);
        if (land > 0 && land < 1) glow = Math.max(glow, 0.5f * (float) Math.sin(Math.PI * land));
        if (rise > 0 && glow > 0) {
            float gr = dotR * 3.2f;
            fill.setShader(new RadialGradient(x, y, gr,
                    new int[] {withAlpha(CYAN, glow), withAlpha(CYAN, 0)}, null, Shader.TileMode.CLAMP));
            canvas.drawCircle(x, y, gr, fill);
            fill.setShader(null);
        }
        if (rise > 0) {
            fill.setColor(CYAN);
            fill.setAlpha(Math.round(255 * Math.min(1f, rise * 5)));
            canvas.drawCircle(x, y, dotR, fill);
            fill.setAlpha(255);
        }
    }

    /** One soft cyan ring expanding out from the mark and fading. */
    private void ripple(Canvas canvas, float cx, float cy, float t) {
        if (t <= 0 || t >= 1) return;
        float e = 1 - (1 - t) * (1 - t);
        ring.setShader(null);
        ring.setColor(withAlpha(CYAN, 0.32f * (1 - t) * (1 - t)));
        ring.setStrokeWidth((0.4f + 1.4f * (1 - t)) * unit);
        canvas.drawCircle(cx, cy, (RING_R + STROKE / 2 + 11 * e) * unit, ring);
        ring.setStrokeWidth(STROKE * unit);
    }

    /**
     * Colours the arc from 12 o'clock (angle 0) to the dot (angle {@code sweep}): ink, then over the
     * last {@code trail} degrees grey and pale cyan.
     */
    private static Shader trailShader(float cx, float cy, float sweep, float trail) {
        float[] at = {0, Math.max(0, sweep - trail), Math.max(0, sweep - trail / 2), sweep};
        int[] colors = new int[at.length];
        float[] positions = new float[at.length];
        for (int i = 0; i < at.length; i++) {
            if (i > 0 && at[i] <= at[i - 1]) at[i] = at[i - 1] + 0.01f;
            float f = 1 - (sweep - at[i]) / trail; // 0 at the settled end, 1 at the dot
            colors[i] = f <= 0 ? INK : f < 0.5f ? mix(INK, GREY, f * 2) : mix(GREY, PALE, f * 2 - 1);
            positions[i] = at[i] / 360f;
        }
        SweepGradient shader = new SweepGradient(cx, cy, colors, positions);
        Matrix turn = new Matrix();
        turn.setRotate(-90, cx, cy); // SweepGradient starts at 3 o'clock; the ring starts at 12
        shader.setLocalMatrix(turn);
        return shader;
    }

    private static int mix(int a, int b, float t) {
        return Color.rgb(
                Math.round(Color.red(a) + (Color.red(b) - Color.red(a)) * t),
                Math.round(Color.green(a) + (Color.green(b) - Color.green(a)) * t),
                Math.round(Color.blue(a) + (Color.blue(b) - Color.blue(a)) * t));
    }

    private static int withAlpha(int color, float alpha) {
        return (Math.round(255 * Math.max(0f, Math.min(1f, alpha))) << 24) | (color & 0xFFFFFF);
    }
}
