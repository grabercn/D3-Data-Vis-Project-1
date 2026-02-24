console.log("alright, locking in the sizes and averaging the data to fix the crashes...");

// ==========================================
// 1. DASHBOARD LAYOUT
// ==========================================
// wipe the page so live-server doesn't duplicate stuff
d3.select("body").selectAll("*").remove();

// header & required metadata
d3.select("body").append("h1").text("Global Working Hours & Wealth");
d3.select("body").append("p").html("<strong>By Christian Graber</strong> | Data from <a href='https://ourworldindata.org/' target='_blank'>Our World in Data</a>").attr("class", "subtitle");

// dropdown controls
const controls = d3.select("body").append("div").attr("class", "controls");
controls.append("label").text("Explore: ");
const attrSelect = controls.append("select").attr("id", "attr-select");
attrSelect.append("option").attr("value", "Working hours per worker").text("Working Hours Per Worker");
attrSelect.append("option").attr("value", "GDP per capita").text("GDP Per Capita");

// a new refined CUSTOM CHECKBOX DROPDOWN
controls.append("label").text(" Highlight Country: ").style("margin-left", "15px");
const multiSelectWrap = controls.append("div").style("position", "relative").style("display", "inline-block");

// The button you click to open the menu
const multiSelectBtn = multiSelectWrap.append("button").attr("id", "multi-select-btn").text("Select Countries ▼")
    .style("padding", "8px 12px").style("background", "#0f172a").style("color", "#f8fafc")
    .style("border", "1px solid #475569").style("border-radius", "6px").style("cursor", "pointer").style("font-family", "inherit");

// The hidden menu panel that holds the checkboxes
const multiSelectMenu = multiSelectWrap.append("div").attr("id", "multi-select-menu")
    .style("display", "none").style("position", "absolute").style("top", "100%").style("left", "0")
    .style("background", "#1e293b").style("border", "1px solid #475569").style("border-radius", "6px")
    .style("max-height", "300px").style("overflow-y", "auto").style("z-index", "2000")
    .style("min-width", "220px").style("padding", "10px").style("box-shadow", "0 10px 20px rgba(0,0,0,0.5)");

// Clear All Button inside the menu
multiSelectMenu.append("div").style("margin-bottom", "10px").style("border-bottom", "1px solid #334155").style("padding-bottom", "8px")
    .append("a").style("cursor", "pointer").style("color", "#38bdf8").style("font-weight", "bold").text("↺ Clear All Selections")
    .on("click", () => { selectedCountries.clear(); updateHighlights(); });

// Toggle menu logic
multiSelectBtn.on("click", (e) => {
    e.stopPropagation();
    const isVisible = multiSelectMenu.style("display") === "block";
    multiSelectMenu.style("display", isVisible ? "none" : "block");
});
d3.select("body").on("click.menu", () => multiSelectMenu.style("display", "none")); // Close if click outside
multiSelectMenu.on("click", e => e.stopPropagation()); // Keep open when clicking inside
// build the grid layout using CSS classes instead of hardcoded white backgrounds!
const mapDiv = d3.select("body").append("div").attr("class", "card map-card");
mapDiv.append("h3").attr("id", "map-title").text("Global Map");

// The 3 evenly spaced charts
const bottomRow = d3.select("body").append("div").attr("class", "row");
const scatterDiv = bottomRow.append("div").attr("class", "card");
const histDiv = bottomRow.append("div").attr("class", "card");
const correlDiv = bottomRow.append("div").attr("class", "card");

scatterDiv.append("h3").attr("id", "scatter-title").text("Trend Over Time");
histDiv.append("h3").attr("id", "hist-title").text("Distribution");
correlDiv.append("h3").attr("id", "correl-title").text("Correlation");

// Master Timeline
const timelineRow = d3.select("body").append("div").attr("class", "card timeline-card");
timelineRow.append("h3").text("Filter by Year Range");

// hover tooltip (removed the hardcoded white background here too!)
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

// ==========================================
// 2. STATE & DATA
// ==========================================
let globalData = [], geoData = {};
let currentAttr = "Working hours per worker";
let currentYearRange = [2000, 2020]; // default zoom
let selectedCountries = new Set(); 
let averagedData = []; // holds the averages for the map/hist

Promise.all([
    d3.csv('data/combined_gdp_working_hours.csv'),
    d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
]).then(([csvData, mapData]) => {
    
    // clean the csv numbers
    csvData.forEach(d => {
        d["GDP per capita"] = +d["GDP per capita"]; 
        d["Working hours per worker"] = +d["Working hours per worker"]; 
        d["Year"] = +d["Year"]; 
    });

    // drop missing or zero data
    globalData = csvData.filter(d => d.Year >= 1950 && d["Working hours per worker"] > 0 && d["GDP per capita"] > 0);
    geoData = mapData;

    // here we fill dropdown and add a listener for the event change ---
    const uniqueCountries = Array.from(new Set(globalData.map(d => d.Entity))).sort();
    uniqueCountries.forEach(c => {
        const row = multiSelectMenu.append("div").style("margin", "5px 0");
        const lbl = row.append("label").style("cursor", "pointer").style("color", "#cbd5e1").style("display", "flex").style("align-items", "center").style("gap", "8px");
        
        lbl.append("input").attr("type", "checkbox").attr("value", c).attr("class", "country-cb")
            .on("change", function() {
                if (this.checked) selectedCountries.add(c);
                else selectedCountries.delete(c);
                updateHighlights();
            });
        lbl.append("span").text(c);
    });

    // setup all the svg elements
    initMap();
    initHistogram();
    initCorrelation();
    initScatter();
    initTimeline();

    // listen for dropdown changes
    attrSelect.on("change", function() {
        currentAttr = this.value;
        updateCharts();
    });

}).catch(e => console.error("Data broke:", e));


// ==========================================
// 3. INIT CHART CONTAINERS (Fixed Sizes)
// ==========================================
let mapSvg, mapPath;
let scatterSvg, xScatter, yScatter, rScale, scatterCirclesGroup, scatterBrushGroup, xTimeline;
let histSvg, xHist, yHist, histBrushGroup;
let correlSvg, xCorrel, yCorrel, correlBrushGroup, correlCirclesGroup;
let timelineSvg, tBrushGroup;

const colorPalette = d3.scaleOrdinal(d3.schemeTableau10);

// --- MAP ---
function initMap() {
    mapSvg = mapDiv.append("svg")
        .attr("viewBox", "0 0 900 400")
        .style("width", "100%")
        .style("height", "auto")
        .on("click", function() {
            // When you click the blank space, clear everything
            selectedCountries.clear(); 
            updateHighlights(); 
        });

    const proj = d3.geoNaturalEarth1().scale(150).translate([450, 200]);
    mapPath = d3.geoPath().projection(proj);

    mapSvg.append("g").selectAll("path").data(geoData.features).enter()
        .append("path")
        .attr("class", "country-path") // FIX 2: Matched this class name to updateCharts!
        .attr("d", mapPath) 
        .attr("fill", "#ddd").attr("stroke", "white").attr("stroke-width", 0.5)
        .on("mouseover", function(e, d) {
            d3.select(this).attr("stroke", "black").attr("stroke-width", 2).raise();
            const info = averagedData.find(x => x.Code === d.id);
            tooltip.style("opacity", 1).html(`<strong>${d.properties.name}</strong><br>${currentAttr}: ${info ? info.value.toFixed(2) : "N/A"}`)
                .style("left", (e.pageX + 10) + "px").style("top", (e.pageY - 28) + "px");
        })
        .on("mouseleave", function() {
            d3.select(this).attr("stroke", "white").attr("stroke-width", 0.5);
        })
        .on("click", function(event, d) {
            event.stopPropagation(); 
            const info = averagedData.find(x => x.Code === d.id);
            if (!info) return; 

            // --- MULTI-SELECT LOGIC ---
            const isMulti = event.ctrlKey || event.metaKey;

            if (selectedCountries.has(info.Entity)) {
                selectedCountries.delete(info.Entity); // Toggle off if already selected
            } else {
                if (!isMulti) selectedCountries.clear(); // Only clear if NOT holding Ctrl
                selectedCountries.add(info.Entity);
            }
            updateHighlights();
        });
}

function initTimeline() {
    const margin = {top: 10, right: 40, bottom: 30, left: 40};
    const width = 1200 - margin.left - margin.right;
    const height = 80 - margin.top - margin.bottom; // Taller for prominence

    const rootSvg = timelineRow.append("svg").attr("viewBox", `0 0 1200 80`).style("width", "100%").style("height", "auto");
    timelineSvg = rootSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    xTimeline = d3.scaleLinear().range([0, width]).domain([1950, 2022]);

    // Draw a big axis with large, bold fonts
    const xAxis = d3.axisBottom(xTimeline).tickFormat(d3.format("d")).ticks(20);
    timelineSvg.append("g")
        .attr("transform", `translate(0,${height / 2})`)
        .call(xAxis)
        .selectAll("text")
        .style("font-size", "16px")
        .style("font-weight", "bold");

    // The Big Brush
    const tBrush = d3.brushX().extent([[0, 0], [width, height]]).on("brush", e => {
        if (!e.selection) return;
        currentYearRange = e.selection.map(xTimeline.invert);
        updateCharts();
    });

    tBrushGroup = timelineSvg.append("g").attr("class", "brush").call(tBrush).call(tBrush.move, [2000, 2020].map(xTimeline));
}

function initScatter() {
    const margin = {top: 20, right: 20, bottom: 60, left: 60};
    const width = 500 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Make it responsive with viewBox
    const rootSvg = scatterDiv.append("svg").attr("viewBox", "0 0 500 400").style("width", "100%").style("height", "auto");
    rootSvg.append("defs").append("clipPath").attr("id", "clip").append("rect").attr("width", width).attr("height", height);
    
    scatterSvg = rootSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    xScatter = d3.scaleLinear().range([0, width]);
    yScatter = d3.scaleLinear().range([height, 0]);
    rScale = d3.scaleLinear().range([3, 15]);

    scatterSvg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    scatterSvg.append("g").attr("class", "y-axis");

    const chartArea = scatterSvg.append("g").attr("clip-path", "url(#clip)");

    // brush on top of circles
    scatterBrushGroup = chartArea.append("g").attr("class", "brush")
    .on("click", function(event, d) {
            event.stopPropagation(); 
            
            // --- MULTI-SELECT LOGIC ---
            const isMulti = event.ctrlKey || event.metaKey;

            if (selectedCountries.has(d.Entity)) {
                selectedCountries.delete(d.Entity);
            } else {
                if (!isMulti) selectedCountries.clear(); 
                selectedCountries.add(d.Entity);
            }
            updateHighlights();
        });    
    scatterCirclesGroup = chartArea.append("g");
}

function initHistogram() {
    const margin = {top: 20, right: 20, bottom: 40, left: 50};
    const width = 500 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Make it responsive with viewBox
    const rootSvg = histDiv.append("svg").attr("viewBox", "0 0 500 400").style("width", "100%").style("height", "auto");
    histSvg = rootSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    
    xHist = d3.scaleLinear().range([0, width]);
    yHist = d3.scaleLinear().range([height, 0]);

    histSvg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    histSvg.append("g").attr("class", "y-axis");

    histBrushGroup = histSvg.append("g").attr("class", "brush");
    histBrushGroup.call(d3.brushX().extent([[0, 0], [width, height]]).on("brush end", brushedHist));
}

function initCorrelation() {
    // big wide chart
    const margin = {top: 20, right: 20, bottom: 40, left: 60};
    const width = 500 - margin.left - margin.right; // Shrunk from 900 to 500
    const height = 400 - margin.top - margin.bottom;

    // Use 500 400 viewBox
    const rootSvg = correlDiv.append("svg").attr("viewBox", `0 0 500 400`).style("width", "100%").style("height", "auto");
    rootSvg.append("defs").append("clipPath").attr("id", "correl-clip").append("rect").attr("width", width).attr("height", height);

    correlSvg = rootSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    xCorrel = d3.scaleLinear().range([0, width]);
    yCorrel = d3.scaleLinear().range([height, 0]);

    correlSvg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    correlSvg.append("g").attr("class", "y-axis");

    // labels
    correlSvg.append("text").attr("class", "x-label").attr("text-anchor", "end").attr("x", width).attr("y", height + 35);
    correlSvg.append("text").attr("class", "y-label").attr("text-anchor", "end").attr("transform", "rotate(-90)").attr("y", -45).attr("x", 0);

    const chartArea = correlSvg.append("g").attr("clip-path", "url(#correl-clip)");

    // brush setup
    correlBrushGroup = chartArea.append("g").attr("class", "brush");
    correlBrushGroup.call(d3.brush().extent([[0, 0], [width, height]]).on("brush end", brushedCorrel));

    correlCirclesGroup = chartArea.append("g");
}


// ==========================================
// 4. MAIN UPDATE LOGIC
// ==========================================
function updateCharts() {
    // update labels
    d3.select("#map-title").text(`Map: ${currentAttr} (Avg ${Math.round(currentYearRange[0])}-${Math.round(currentYearRange[1])})`);
    d3.select("#scatter-title").text(`Timeline: ${currentAttr}`);
    d3.select("#hist-title").text(`Distribution of ${currentAttr}`);

    // filter scatter data
    const scatterData = globalData.filter(d => d.Year >= currentYearRange[0] && d.Year <= currentYearRange[1]);
    const secondaryAttr = currentAttr === "Working hours per worker" ? "GDP per capita" : "Working hours per worker";

    // calculate averages for map/hist/correl
    const grouped = d3.groups(scatterData, d => d.Entity);
    averagedData = grouped.map(g => {
        return {
            Entity: g[0],
            Code: g[1][0].Code, 
            value: d3.mean(g[1], d => d[currentAttr]), // for map/hist
            hours: d3.mean(g[1], d => d["Working hours per worker"]), // for crossover
            gdp: d3.mean(g[1], d => d["GDP per capita"]) // for crossover
        };
    });

    // --- MAP ---
    const mapColor = d3.scaleSequential(d3.interpolateOrRd).domain(d3.extent(averagedData, d => d.value));
    mapSvg.selectAll(".country-path").transition().duration(200).attr("fill", d => {
        const info = averagedData.find(x => x.Code === d.id);
        return info ? mapColor(info.value) : "#eee";
    });

    // --- SCATTER ---
    xScatter.domain(currentYearRange);
    scatterSvg.select(".x-axis").call(d3.axisBottom(xScatter).tickFormat(d3.format("d")));

    if (scatterData.length > 0) {
        // grab all Y values and sort them to easily find outliers
        const yVals = scatterData.map(d => d[currentAttr]).sort(d3.ascending);

        // grab the 1st and 99th percentiles to "cull" extreme stray data points
        const yMin = d3.quantile(yVals, 0.01); 
        const yMax = d3.quantile(yVals, 0.99);
        
        // Add some padding so dots don't get sliced in half at the top/bottom
        const padding = (yMax - yMin) * 0.15;
        
        yScatter.domain([Math.max(0, yMin - padding), yMax + padding]);
        
        // animate the axis so it smoothly resizes when you change the dropdown
        scatterSvg.select(".y-axis").transition().duration(500).call(d3.axisLeft(yScatter));
        
        rScale.domain(d3.extent(globalData, d => d[secondaryAttr]));
    }

    const circles = scatterCirclesGroup.selectAll("circle").data(scatterData, d => d.Entity + d.Year);
    circles.exit().remove();
    circles.enter().append("circle")
        .attr("fill", d => colorPalette(d.Entity)).attr("stroke", "white").attr("opacity", 0.7)
        .merge(circles)
        .attr("cx", d => xScatter(d.Year)).attr("cy", d => yScatter(d[currentAttr])).attr("r", d => rScale(d[secondaryAttr]))
        .on("mouseover", function(event, d) {
            d3.select(this).attr("stroke", "black").attr("stroke-width", 2).raise();
            tooltip.style("opacity", 1).html(`<strong>${d.Entity} (${d.Year})</strong><br>${currentAttr}: ${d[currentAttr]}<br>${secondaryAttr}: ${d[secondaryAttr]}`)
                .style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", function() {
            d3.select(this).attr("stroke", "white").attr("stroke-width", 1);
            tooltip.style("opacity", 0);
        })
        .on("mouseover", function(event, d) {
            d3.select(this).attr("stroke", "black").attr("stroke-width", 2).raise();
            tooltip.style("opacity", 1).html(`<strong>${d.Entity} (${d.Year})</strong><br>${currentAttr}: ${d[currentAttr]}<br>${secondaryAttr}: ${d[secondaryAttr]}`)
                .style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", function() {
            d3.select(this).attr("stroke", "white").attr("stroke-width", 1);
            tooltip.style("opacity", 0);
        })
        // This should make the dots clickable I think
       .on("click", function(event, d) {
            event.stopPropagation(); // Stops D3 from getting confused by the brush background
            
            const isMulti = event.ctrlKey || event.metaKey;

            if (selectedCountries.has(d.Entity)) {
                selectedCountries.delete(d.Entity); // Toggle off if already selected
            } else {
                if (!isMulti) selectedCountries.clear(); // Clear others if not holding Ctrl
                selectedCountries.add(d.Entity);
            }
            updateHighlights();
        });

    // --- HISTOGRAM ---
    xHist.domain(d3.extent(averagedData, d => d.value));
    const bins = d3.bin().value(d => d.value).domain(xHist.domain()).thresholds(15)(averagedData);
    yHist.domain([0, d3.max(bins, d => d.length) || 1]);

    histSvg.select(".x-axis").call(d3.axisBottom(xHist).ticks(5));
    histSvg.select(".y-axis").call(d3.axisLeft(yHist));

    const bars = histSvg.selectAll(".hist-bar").data(bins);
    bars.exit().remove();

    bars.enter().append("rect").attr("class", "hist-bar").attr("fill", "steelblue")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "black"); // highlight bar
            tooltip.style("opacity", 1) // make tooltip visible
                .html(`<strong>Range:</strong> ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}<br><strong>Count:</strong> ${d.length} Countries`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseleave", function() {
            d3.select(this).attr("fill", "steelblue"); // revert color
            tooltip.style("opacity", 0); // hide tooltip
        })
        // ------------------------------
        .merge(bars)
        .attr("x", d => xHist(d.x0) + 1)
        .attr("y", d => yHist(d.length))
        .attr("width", d => Math.max(0, xHist(d.x1) - xHist(d.x0) - 1))
        .attr("height", d => 340 - yHist(d.length));


    // --- CORRELATION ---
    const xAttr = currentAttr === "Working hours per worker" ? "hours" : "gdp";
    const yAttr = currentAttr === "Working hours per worker" ? "gdp" : "hours";

    correlSvg.select(".x-label").text(currentAttr === "Working hours per worker" ? "Working Hours per worker" : "GDP per capita");
    correlSvg.select(".y-label").text(currentAttr === "Working hours per worker" ? "GDP per capita" : "Working hours per worker");

    xCorrel.domain([0, d3.max(averagedData, d => d[xAttr]) * 1.1]);
    yCorrel.domain([0, d3.max(averagedData, d => d[yAttr]) * 1.1]);

    correlSvg.select(".x-axis").transition().duration(200).call(d3.axisBottom(xCorrel));
    correlSvg.select(".y-axis").transition().duration(200).call(d3.axisLeft(yCorrel));

    const cCircles = correlCirclesGroup.selectAll("circle").data(averagedData, d => d.Entity);
    cCircles.exit().remove();
    
    cCircles.enter().append("circle")
        .attr("fill", d => colorPalette(d.Entity)).attr("stroke", "white").attr("opacity", 0.7).attr("r", 6)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("stroke", "black").attr("stroke-width", 2).raise();
            tooltip.style("opacity", 1).html(`<strong>${d.Entity}</strong><br>${xAttr}: ${d[xAttr].toFixed(2)}<br>${yAttr}: ${d[yAttr].toFixed(2)}`)
                .style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", function() {
            d3.select(this).attr("stroke", "white").attr("stroke-width", 1);
            tooltip.style("opacity", 0);
        })
        .merge(cCircles)
        .transition().duration(200)
        .attr("cx", d => xCorrel(d[xAttr]))
        .attr("cy", d => yCorrel(d[yAttr]));

    correlBrushGroup.raise(); // keep brush on top
    
    updateHighlights(); 
}


// ==========================================
// 5. BRUSHING & HIGHLIGHTING
// ==========================================
function brushedScatter(e) {
    if (!e.selection) { selectedCountries.clear(); updateHighlights(); return; }
    if (e.sourceEvent && e.sourceEvent.type !== "zoom") histBrushGroup.call(d3.brush().move, null); // clear other brush

    const [[x0, y0], [x1, y1]] = e.selection;
    selectedCountries.clear();
    
    // figure out which circles are in the box
    scatterCirclesGroup.selectAll("circle").each(function(d) {
        const cx = xScatter(d.Year), cy = yScatter(d[currentAttr]);
        if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) selectedCountries.add(d.Entity);
    });
    updateHighlights();
}


function brushedHist(e) {
    if (!e.selection) { selectedCountries.clear(); updateHighlights(); return; }
    if (e.sourceEvent && e.sourceEvent.type !== "zoom") scatterBrushGroup.call(d3.brush().move, null);

    const [x0, x1] = e.selection;
    const minVal = xHist.invert(x0), maxVal = xHist.invert(x1);

    selectedCountries.clear();
    averagedData.forEach(d => {
        if (d.value >= minVal && d.value <= maxVal) selectedCountries.add(d.Entity);
    });
    updateHighlights();
}

function brushedCorrel(e) {
    if (!e.selection) { selectedCountries.clear(); updateHighlights(); return; }
    
    // wipe other brushes so they don't fight
    if (e.sourceEvent && e.sourceEvent.type !== "zoom") {
        scatterBrushGroup.call(d3.brush().move, null);
        histBrushGroup.call(d3.brushX().move, null);
    }

    const [[x0, y0], [x1, y1]] = e.selection;
    const xAttr = currentAttr === "Working hours per worker" ? "hours" : "gdp";
    const yAttr = currentAttr === "Working hours per worker" ? "gdp" : "hours";

    selectedCountries.clear();
    averagedData.forEach(d => {
        const cx = xCorrel(d[xAttr]), cy = yCorrel(d[yAttr]);
        if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) selectedCountries.add(d.Entity);
    });
    updateHighlights();
}

function updateHighlights() {
    const active = selectedCountries.size > 0;

    // Sync the dropdown to reflect the current selection (if only 1 country is selected)
    // 1. Physically check/uncheck the boxes
    d3.selectAll(".country-cb").property("checked", function() {
        return selectedCountries.has(this.value);
    });
    
    // 2. Update the main button text so the user knows how many are selected
    const btn = d3.select("#multi-select-btn");
    if (selectedCountries.size === 0) {
        btn.text("Select Countries ▼").style("color", "#f8fafc");
    } else if (selectedCountries.size === 1) {
        btn.text(Array.from(selectedCountries)[0] + " ▼").style("color", "#38bdf8");
    } else {
        btn.text(selectedCountries.size + " Selected ▼").style("color", "#38bdf8");
    }

    // 1. Map Highlighting
    mapSvg.selectAll(".country-path").attr("opacity", d => {
        const info = averagedData.find(x => x.Code === d.id);
        return (!active || (info && selectedCountries.has(info.Entity))) ? 1 : 0.1;
    });

    // 2. TIMELINE UPGRADE
    const sCircles = scatterCirclesGroup.selectAll("circle")
        .attr("opacity", d => {
            if (!active) return 0.5; // Normal view
            return selectedCountries.has(d.Entity) ? 1 : 0.02; // Selected vs Ghost mode
        })
        .attr("stroke", d => {
            // Remove the white border from ghosted dots so they don't clutter
            return (!active || selectedCountries.has(d.Entity)) ? "rgba(255,255,255,0.5)" : "none";
        });
        
    // Magic Fix: Pull all selected circles to the absolute front layer!
    if (active) sCircles.filter(d => selectedCountries.has(d.Entity)).raise();

    // 3. Histogram Highlighting
    histSvg.selectAll(".hist-bar").attr("opacity", d => {
        const hasSelected = d.some(c => selectedCountries.has(c.Entity));
        return (!active || hasSelected) ? 1 : 0.2;
    });

    // 4. CORRELATION UPGRADE (Apply same fix here)
    const cCircles = correlCirclesGroup.selectAll("circle")
        .attr("opacity", d => {
            if (!active) return 0.5;
            return selectedCountries.has(d.Entity) ? 1 : 0.02;
        })
        .attr("stroke", d => (!active || selectedCountries.has(d.Entity)) ? "rgba(255,255,255,0.5)" : "none");
        
    // Magic Fix: Pull all selected circles to the absolute front layer!
    if (active) cCircles.filter(d => selectedCountries.has(d.Entity)).raise();
}