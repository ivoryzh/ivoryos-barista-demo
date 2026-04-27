document.addEventListener('DOMContentLoaded', () => {
    const updateScale = () => {
        const scale = Math.min(window.innerWidth / 1300, window.innerHeight / 850);
        document.documentElement.style.setProperty('--app-scale', scale);
    };
    window.addEventListener('resize', updateScale);
    updateScale();

    document.getElementById('stepBtn').addEventListener('click', runStep);

    const updateLabel = (id, unit) => {
        const input = document.getElementById(`input${id}`);
        const label = document.getElementById(`val${id}`);
        input.addEventListener('input', () => {
            label.textContent = input.value + unit;
        });
    };
    updateLabel('Beans', 'g');
    updateLabel('Sugar', 'g');
    updateLabel('Milk', 'ml');
});

async function runStep() {
    const btn = document.getElementById('stepBtn');
    btn.disabled = true;
    btn.textContent = "Brewing...";

    // Read values from sliders
    const beans = parseFloat(document.getElementById('inputBeans').value);
    const sugar = parseFloat(document.getElementById('inputSugar').value);
    const milk = parseFloat(document.getElementById('inputMilk').value);

    // Reset UI
    document.getElementById('scoreBadge').style.display = 'none';
    const layers = document.getElementById('layersContainer');
    const mixed = document.getElementById('mixedLiquid');
    
    layers.style.opacity = '1';
    mixed.style.opacity = '0';
    mixed.style.height = '0%';
    
    // Animate avatar to show anticipation
    const avatar = document.querySelector('.avatar');
    avatar.style.transform = 'scale(1.1)';

    try {
        // Run client-side simulation directly
        const prefBeans = 20.0;
        const prefSugar = 5.0;
        const prefMilk = 20.0;
        const cupSize = 240.0;

        let penalty = 0.0;
        penalty += Math.pow((beans - prefBeans) / 3.0, 2) * 1.8;
        penalty += Math.pow((sugar - prefSugar) / 3.0, 2) * 0.9;
        penalty += Math.pow((milk - prefMilk) / 20.0, 2) * 1.2;

        const water = cupSize - milk;
        const idealStrength = (prefBeans / (cupSize - prefMilk)) * 100.0;
        const strengthIndex = (beans / water) * 100.0;
        penalty += Math.pow((strengthIndex - idealStrength) / 3.5, 2) * 1.4;

        if (milk > 90.0 && beans < 12.0) penalty += 1.5;
        if (sugar > 10.0 && milk > 80.0) penalty += 1.0;
        if (beans > 22.0 && sugar < 3.0) penalty += 1.2;

        let rawScore = 10.0 - penalty;
        let score = Math.max(1.0, Math.min(10.0, rawScore));

        const data = {
            params: { beans, sugar, milk },
            score: parseFloat(score.toFixed(2))
        };

        const p = data.params;
        const waterVol = 240 - p.milk;
        const total = p.beans + p.sugar + p.milk + waterVol;
        
        const hSugar = (p.sugar / total) * 90;
        const hBeans = (p.beans / total) * 90;
        const hMilk = (p.milk / total) * 90;
        const hWater = (waterVol / total) * 90;

        // Show layers instantly (no staggered animation per user request)
        document.getElementById('layerSugar').style.height = `${hSugar}%`;
        document.getElementById('layerBeans').style.height = `${hBeans}%`;
        document.getElementById('layerMilk').style.height = `${hMilk}%`;
        document.getElementById('layerWater').style.height = `${hWater}%`;

        // Mix immediately after a short pause
        setTimeout(() => {
            mixCoffee(data.params);
            layers.style.opacity = '0';
            mixed.style.opacity = '1';
            mixed.style.height = '90%';
        }, 800);

        // Show Score
        setTimeout(() => {
            showScore(data.score);
            btn.disabled = false;
            btn.textContent = "Brew & Serve";
            avatar.style.transform = 'scale(1)';
        }, 1600);

    } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.textContent = "Error - Try Again";
        avatar.style.transform = 'scale(1)';
    }
}

function mixCoffee(params) {
    const mixed = document.getElementById('mixedLiquid');
    
    // Calculate bean intensity (base coffee color)
    // 5g is weak (#ba7a4b), 30g is intense black (#110703)
    let beanRatio = params.beans / 30;
    if (beanRatio > 1) beanRatio = 1;
    
    // Blend from weak amber to intense dark brown/black
    const baseCoffeeColor = `color-mix(in srgb, #110703 ${Math.round(beanRatio * 100)}%, #d48c57)`;
    
    // Using a realistic curve for milk blending
    const rawRatio = params.milk / 240; 
    const milkRatio = Math.pow(rawRatio, 0.65); 
    
    const milkPercent = Math.min(Math.floor(milkRatio * 100), 100);
    const coffeePercent = 100 - milkPercent;

    // Use CSS color-mix for the perfect blend (Milk #F8EFE0 vs Coffee)
    const drinkColor = `color-mix(in srgb, #f8efe0 ${milkPercent}%, ${baseCoffeeColor} ${coffeePercent}%)`;
    
    // Create a linear gradient that mimics depth in the liquid
    mixed.style.background = `linear-gradient(180deg, color-mix(in srgb, ${drinkColor} 85%, rgba(255,255,255,0.3) 15%), ${drinkColor})`;

    // Calculate how watered down the coffee is (opacity)
    const water = 240 - params.milk;
    const strength = params.beans / (water || 1);
    
    // Opacity scales with strength. 0 beans = very transparent
    let opacity = params.beans === 0 ? 0.1 : 0.3 + (strength * 6); 
    if (opacity > 1) opacity = 1;
    
    // Milk makes the liquid opaque regardless of water/beans
    if (params.milk > 10) opacity = Math.max(opacity, 0.7 + (params.milk/240)*0.3);
    
    mixed.style.opacity = opacity;
}

function showScore(score) {
    const badge = document.getElementById('scoreBadge');
    badge.textContent = `SCORE: ${score.toFixed(1)}`;
    badge.style.display = 'block';
    badge.style.animation = 'none';
    badge.offsetHeight; // trigger reflow
    badge.style.animation = 'pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    
    const avatar = document.querySelector('.avatar');
    if (score >= 8.5) {
        avatar.textContent = '😍';
    } else if (score >= 6) {
        avatar.textContent = '😋';
    } else if (score >= 4) {
        avatar.textContent = '😐';
    } else {
        avatar.textContent = '🤢';
    }
}
