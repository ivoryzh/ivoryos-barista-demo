const CUP_SIZE = 240;
const POLL_MS = 700;

let lastSeq = 0;
let pollInFlight = false;
let displayedScore = null;
let displayedMood = null;
let displayedAction = "";
let latestSnapshot = null;
let revealedPreference = null;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("revealPreferenceBtn").addEventListener("click", revealPreference);
    refreshState();
    window.setInterval(refreshState, POLL_MS);
});

async function refreshState() {
    if (pollInFlight) {
        return;
    }

    pollInFlight = true;
    try {
        const stateUrl = document.querySelector(".barista-plugin-page")?.dataset.stateUrl || "./api/state";
        const response = await fetch(`${stateUrl}?since=${lastSeq}`, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`State request failed with ${response.status}`);
        }

        const payload = await response.json();
        const snapshot = normalizeSnapshot(payload.snapshot);
        updateMetrics(snapshot);

        if (payload.events.length === 0) {
            renderDrink(snapshot, false);
            if (snapshot.score !== null) {
                setScore(snapshot.score, false);
                setMood(scoreToMood(snapshot.score), false);
                setLiveAction("Served", false);
            } else {
                setLiveAction("Waiting", false);
            }
            return;
        }

        for (const event of payload.events) {
            lastSeq = Math.max(lastSeq, event.seq);
            playEvent(event);
        }
    } catch (error) {
        console.error(error);
        setLiveAction("Disconnected", false);
    } finally {
        pollInFlight = false;
    }
}

function normalizeSnapshot(snapshot) {
    return {
        beans: Number(snapshot.bean_grams || 0),
        sugar: Number(snapshot.sugar_grams || 0),
        milk: Number(snapshot.milk_ml || 0),
        water: Number(snapshot.water_ml || 0),
        cupSize: Number(snapshot.cup_size_ml || CUP_SIZE),
        score: snapshot.score === null || snapshot.score === undefined ? null : Number(snapshot.score),
    };
}

function updateMetrics(snapshot) {
    latestSnapshot = snapshot;
    document.getElementById("metricBeans").textContent = `${snapshot.beans.toFixed(1)}g`;
    document.getElementById("metricSugar").textContent = `${snapshot.sugar.toFixed(1)}g`;
    document.getElementById("metricMilk").textContent = `${snapshot.milk.toFixed(1)}ml`;
    document.getElementById("metricWater").textContent = `${snapshot.water.toFixed(1)}ml`;
    document.getElementById("revealPreferenceBtn").disabled = snapshot.score === null;

    if (revealedPreference !== null) {
        renderPreferencePanel();
    }
}

function renderDrink(snapshot, animateMix) {
    const water = snapshot.water || Math.max(snapshot.cupSize - snapshot.milk, 0);
    const total = snapshot.beans + snapshot.sugar + snapshot.milk + water || CUP_SIZE;
    const heights = {
        sugar: (snapshot.sugar / total) * 88,
        beans: (snapshot.beans / total) * 88,
        milk: (snapshot.milk / total) * 88,
        water: (water / total) * 88,
    };

    const layerSugar = document.getElementById("layerSugar");
    const layerBeans = document.getElementById("layerBeans");
    const layerMilk = document.getElementById("layerMilk");
    const layerWater = document.getElementById("layerWater");
    const layers = document.getElementById("layersContainer");
    const mixedLiquid = document.getElementById("mixedLiquid");

    layerSugar.style.height = `${heights.sugar}%`;
    layerBeans.style.height = `${heights.beans}%`;
    layerMilk.style.height = `${heights.milk}%`;
    layerWater.style.height = `${heights.water}%`;

    const fillStyle = buildMixedLiquid(snapshot);

    if (animateMix) {
        layers.style.opacity = "1";
        mixedLiquid.style.opacity = "0";
        mixedLiquid.style.height = "0%";

        window.setTimeout(() => {
            mixedLiquid.style.background = fillStyle.background;
            mixedLiquid.style.opacity = fillStyle.opacity;
            mixedLiquid.style.height = "88%";
            layers.style.opacity = "0";
        }, 420);
        return;
    }

    mixedLiquid.style.background = fillStyle.background;
    mixedLiquid.style.opacity = fillStyle.opacity;
    mixedLiquid.style.height = "88%";
    layers.style.opacity = "0";
}

function buildMixedLiquid(snapshot) {
    const beanRatio = Math.min(snapshot.beans / 30, 1);
    const baseCoffeeColor = mixColors(
        { r: 211, g: 139, b: 88 },
        { r: 18, g: 8, b: 4 },
        beanRatio
    );
    const milkRatio = Math.pow(snapshot.milk / CUP_SIZE, 0.65);
    const drinkColor = mixColors(baseCoffeeColor, { r: 248, g: 239, b: 224 }, milkRatio);
    const topColor = mixColors(drinkColor, { r: 255, g: 255, b: 255 }, 0.14);

    const water = snapshot.water || Math.max(CUP_SIZE - snapshot.milk, 0);
    const strength = snapshot.beans / (water || 1);
    let opacity = snapshot.beans === 0 ? 0.12 : 0.34 + strength * 6;
    opacity = Math.min(opacity, 1);

    if (snapshot.milk > 10) {
        opacity = Math.max(opacity, 0.72 + (snapshot.milk / CUP_SIZE) * 0.24);
    }

    return {
        background: `linear-gradient(180deg, ${rgbString(topColor)} 0%, ${rgbString(drinkColor)} 100%)`,
        opacity: String(opacity),
    };
}

function playEvent(event) {
    const snapshot = normalizeSnapshot(event.snapshot);
    updateMetrics(snapshot);
    pulseStatus();

    if (event.type === "taste") {
        setLiveAction("Tasting", true);
        setMood("neutral", true);
        renderDrink(snapshot, true);
        setScore(snapshot.score, true);
        setMood(scoreToMood(snapshot.score), false);
        setLiveAction("Served", false);
        return;
    }

    setScore(snapshot.score, false);
    setMood("neutral", true);
    setLiveAction(statusLabel(event.type), true);
    renderDrink(snapshot, event.type === "top_up_with_hot_water");
    setMood("neutral", false);
}

function setScore(score, animate) {
    const badge = document.getElementById("scoreBadge");
    const value = document.getElementById("scoreValue");

    if (score === null) {
        displayedScore = null;
        badge.classList.remove("visible");
        value.textContent = "--";
        return;
    }

    const nextScore = Number(score.toFixed(1));
    if (displayedScore === nextScore) {
        value.textContent = nextScore.toFixed(1);
        if (!animate) {
            return;
        }
    }

    displayedScore = nextScore;
    value.textContent = nextScore.toFixed(1);

    if (!animate) {
        badge.classList.add("visible");
        return;
    }

    badge.classList.remove("visible");
    void badge.offsetWidth;
    badge.classList.add("visible");
}

async function revealPreference() {
    const button = document.getElementById("revealPreferenceBtn");
    const stateUrl = document.querySelector(".barista-plugin-page")?.dataset.stateUrl || "./api/state";
    const preferenceUrl = stateUrl.replace(/\/api\/state$/, "/api/preference");

    button.disabled = true;
    button.textContent = "Revealing...";

    try {
        const response = await fetch(preferenceUrl, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`Preference request failed with ${response.status}`);
        }

        const payload = await response.json();
        revealedPreference = normalizePreference(payload.preference);
        renderPreferencePanel();
        button.textContent = "Preference Revealed";
    } catch (error) {
        console.error(error);
        button.textContent = "Reveal Failed";
    } finally {
        if (revealedPreference === null && latestSnapshot?.score !== null) {
            button.disabled = false;
            button.textContent = "Reveal Preference";
        }
    }
}

function normalizePreference(preference) {
    if (!preference) {
        return null;
    }

    return {
        beans: Number(preference.bean_grams || 0),
        sugar: Number(preference.sugar_grams || 0),
        milk: Number(preference.milk_ml || 0),
        water: Number(preference.water_ml || 0),
    };
}

function renderPreferencePanel() {
    if (revealedPreference === null || latestSnapshot === null) {
        return;
    }

    document.getElementById("prefBeans").textContent = `${revealedPreference.beans.toFixed(1)}g`;
    document.getElementById("prefSugar").textContent = `${revealedPreference.sugar.toFixed(1)}g`;
    document.getElementById("prefMilk").textContent = `${revealedPreference.milk.toFixed(1)}ml`;
    document.getElementById("prefWater").textContent = `${revealedPreference.water.toFixed(1)}ml`;
    document.getElementById("preferencePanel").hidden = false;
    document.getElementById("compareCopy").textContent = buildComparison(latestSnapshot, revealedPreference);
}

function buildComparison(snapshot, preference) {
    const beanDelta = signedDelta(snapshot.beans - preference.beans, "g");
    const sugarDelta = signedDelta(snapshot.sugar - preference.sugar, "g");
    const milkDelta = signedDelta(snapshot.milk - preference.milk, "ml");
    return `Compared to the target: beans ${beanDelta}, sugar ${sugarDelta}, milk ${milkDelta}.`;
}

function signedDelta(value, unit) {
    const rounded = Math.round(value * 10) / 10;
    if (rounded === 0) {
        return `match`;
    }

    return `${rounded > 0 ? "+" : ""}${rounded}${unit}`;
}

function setMood(mood, brewing) {
    const avatar = document.getElementById("customerAvatar");
    const reactionCopy = document.getElementById("reactionCopy");

    if (displayedMood === `${mood}:${brewing}`) {
        return;
    }

    displayedMood = `${mood}:${brewing}`;
    avatar.classList.remove("mood-delighted", "mood-pleased", "mood-neutral", "mood-disappointed");
    avatar.classList.add(`mood-${mood}`);
    avatar.classList.toggle("is-brewing", brewing);
    reactionCopy.textContent = brewing ? "Tasting..." : moodLabel(mood);
}

function setLiveAction(text, active) {
    const nextAction = `${text}:${active}`;
    if (displayedAction === nextAction) {
        return;
    }

    displayedAction = nextAction;
    document.getElementById("liveAction").textContent = text;

    const pulse = document.getElementById("statusPulse");
    pulse.classList.toggle("is-active", active);
    if (active) {
        window.setTimeout(() => pulse.classList.remove("is-active"), 900);
    }
}

function pulseStatus() {
    const pulse = document.getElementById("statusPulse");
    pulse.classList.remove("is-active");
    void pulse.offsetWidth;
    pulse.classList.add("is-active");
}

function scoreToMood(score) {
    if (score >= 8.5) {
        return "delighted";
    }

    if (score >= 6) {
        return "pleased";
    }

    if (score >= 4) {
        return "neutral";
    }

    return "disappointed";
}

function moodLabel(mood) {
    if (mood === "delighted") {
        return "Loves it";
    }

    if (mood === "pleased") {
        return "Pretty happy";
    }

    if (mood === "neutral") {
        return "Acceptable";
    }

    return "Not impressed";
}

function statusLabel(eventType) {
    if (eventType === "top_up_with_hot_water") {
        return "Pouring";
    }

    if (eventType === "add_beans" || eventType === "add_sugar" || eventType === "add_milk") {
        return "Brewing";
    }

    return "Working";
}

function mixColors(start, end, amount) {
    const mix = Math.max(0, Math.min(1, amount));
    return {
        r: Math.round(start.r + (end.r - start.r) * mix),
        g: Math.round(start.g + (end.g - start.g) * mix),
        b: Math.round(start.b + (end.b - start.b) * mix),
    };
}

function rgbString(color) {
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
}
