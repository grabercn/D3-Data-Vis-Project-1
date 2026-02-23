console.log("alright, locking in the sizes and averaging the data to fix the crashes...");

// ==========================================
// 1. DASHBOARD LAYOUT
// ==========================================
// wipe the page so live-server doesn't duplicate stuff
d3.select("body").selectAll("*").remove();

d3.select("body").style("font-family", "sans-serif").style("background", "#f0f2f5").style("margin", "20px");

// header & required metadata
d3.select("body").append("h1").text("🌍 Global Working Hours & Wealth").style("margin", "0 0 5px 0");
d3.select("body").append("p").html("<strong>By Christian Graber</strong> | Data from <a href='https://ourworldindata.org/'>Our World in Data</a>").style("margin-top", "0").style("color", "#555");

// dropdown to swap data
const controls = d3.select("body").append("div").style("margin-bottom", "15px");
controls.append("label").text("Explore: ").style("font-weight", "bold");
const attrSelect = controls.append("select").attr("id", "attr-select");
attrSelect.append("option").attr("value", "Working hours per worker").text("Working Hours Per Worker");
attrSelect.append("option").attr("value", "GDP per capita").text("GDP Per Capita");

// build the grid layout
const mapDiv = d3.select("body").append("div").style("background", "white").style("padding", "10px").style("margin-bottom", "20px").style("border-radius", "8px");
mapDiv.append("h3").attr("id", "map-title").text("Global Map").style("margin-top", "0");

const bottomRow = d3.select("body").append("div").style("display", "flex").style("gap", "20px");
const scatterDiv = bottomRow.append("div").style("background", "white").style("padding", "10px").style("border-radius", "8px");
const histDiv = bottomRow.append("div").style("background", "white").style("padding", "10px").style("border-radius", "8px");

scatterDiv.append("h3").attr("id", "scatter-title").text("Trend Over Time").style("margin-top", "0");
histDiv.append("h3").attr("id", "hist-title").text("Distribution").style("margin-top", "0");

// hover tooltip
const tooltip = d3.select("body").append("div").style("position", "absolute").style("opacity", 0).style("background", "white").style("padding", "10px").style("border", "1px solid #ccc").style("border-radius", "5px").style("pointer-events", "none");


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

    // setup all the svg elements
    initMap();
    initScatter();
    initHistogram();

    // listen for dropdown changes
    attrSelect.on("change", function() {
        currentAttr = this.value;
        updateCharts();
    });

    updateCharts();
}).catch(e => console.error("Data broke:", e));


// ==========================================
// 3. INIT CHART CONTAINERS (Fixed Sizes)
// ==========================================
let mapSvg, mapPath;
let scatterSvg, xScatter, yScatter, rScale, scatterCirclesGroup, scatterBrushGroup, xTimeline;
let histSvg, xHist, yHist, histBrushGroup;

const colorPalette = d3.scaleOrdinal(d3.schemeTableau10);

function initMap() {
    // using fixed 900x400 so d3 math doesn't break
    mapSvg = mapDiv.append("svg").attr("width", 900).attr("height", 400);
    const projection = d3.geoNaturalEarth1().scale(150).translate([450, 200]);
    mapPath = d3.geoPath().projection(projection);

    // draw blank world
    mapSvg.append("g").selectAll("path").data(geoData.features).enter()
        .append("path").attr("class", "country-path")
        .attr("fill", "#ccc").attr("stroke", "white").attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
            const info = averagedData.find(x => x.Code === d.id);
            if (!info) return;
            d3.select(this).attr("stroke", "black").attr("stroke-width", 2).raise();
            tooltip.style("opacity", 1).html(`<strong>${info.Entity}</strong><br>Avg ${currentAttr}: ${info.value.toFixed(1)}`)
                .style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 15) + "px");
        })
        .on("mouseleave", function() {
            d3.select(this).attr("stroke", "white").attr("stroke-width", 0.5);
            tooltip.style("opacity", 0);
        });
}

function initScatter() {
    // fixed 600x400
    const margin = {top: 20, right: 20, bottom: 60, left: 60};
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const rootSvg = scatterDiv.append("svg").attr("width", 600).attr("height", 400);
    rootSvg.append("defs").append("clipPath").attr("id", "clip").append("rect").attr("width", width).attr("height", height);
    
    scatterSvg = rootSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    
    xScatter = d3.scaleLinear().range([0, width]);
    yScatter = d3.scaleLinear().range([height, 0]);
    rScale = d3.scaleLinear().range([3, 15]);

    scatterSvg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    scatterSvg.append("g").attr("class", "y-axis");

    const chartArea = scatterSvg.append("g").attr("clip-path", "url(#clip)");

    // brush on top of circles
    scatterBrushGroup = chartArea.append("g").attr("class", "brush");
    scatterBrushGroup.call(d3.brush().extent([[0, 0], [width, height]]).on("brush end", brushedScatter));
    
    scatterCirclesGroup = chartArea.append("g");

    // timeline slider
    const tGroup = scatterSvg.append("g").attr("transform", `translate(0,${height + 30})`);
    xTimeline = d3.scaleLinear().range([0, width]).domain([1950, 2022]);
    tGroup.append("g").attr("transform", `translate(0,20)`).call(d3.axisBottom(xTimeline).tickFormat(d3.format("d")));

    const tBrush = d3.brushX().extent([[0, 0], [width, 20]]).on("brush", e => {
        if (!e.selection) return;
        currentYearRange = e.selection.map(xTimeline.invert);
        updateCharts();
    });
    tGroup.append("g").attr("class", "brush").call(tBrush).call(tBrush.move, [2000, 2020].map(xTimeline));
}

function initHistogram() {
    // fixed 400x400
    const margin = {top: 20, right: 20, bottom: 40, left: 50};
    const width = 400 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    histSvg = histDiv.append("svg").attr("width", 400).attr("height", 400).append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    xHist = d3.scaleLinear().range([0, width]);
    yHist = d3.scaleLinear().range([height, 0]);

    histSvg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    histSvg.append("g").attr("class", "y-axis");

    histBrushGroup = histSvg.append("g").attr("class", "brush");
    histBrushGroup.call(d3.brushX().extent([[0, 0], [width, height]]).on("brush end", brushedHist));
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

    // calculate averages for map/hist so missing years don't break it
    const grouped = d3.groups(scatterData, d => d.Entity);
    averagedData = grouped.map(g => {
        return {
            Entity: g[0],
            Code: g[1][0].Code, // grab ISO code
            value: d3.mean(g[1], d => d[currentAttr])
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
        yScatter.domain([0, d3.max(scatterData, d => d[currentAttr]) * 1.1]);
        scatterSvg.select(".y-axis").call(d3.axisLeft(yScatter));
        rScale.domain(d3.extent(globalData, d => d[secondaryAttr]));
    }

    const circles = scatterCirclesGroup.selectAll("circle").data(scatterData, d => d.Entity + d.Year);
    circles.exit().remove();
    circles.enter().append("circle")
        .attr("fill", d => colorPalette(d.Entity)).attr("stroke", "white").attr("opacity", 0.7)
        .merge(circles)
        .attr("cx", d => xScatter(d.Year)).attr("cy", d => yScatter(d[currentAttr])).attr("r", d => rScale(d[secondaryAttr]));

    // --- HISTOGRAM ---
    xHist.domain(d3.extent(averagedData, d => d.value));
    const bins = d3.bin().value(d => d.value).domain(xHist.domain()).thresholds(15)(averagedData);
    yHist.domain([0, d3.max(bins, d => d.length) || 1]);

    histSvg.select(".x-axis").call(d3.axisBottom(xHist).ticks(5));
    histSvg.select(".y-axis").call(d3.axisLeft(yHist));

    const bars = histSvg.selectAll(".hist-bar").data(bins);
    bars.exit().remove();
    bars.enter().append("rect").attr("class", "hist-bar").attr("fill", "steelblue")
        .merge(bars)
        .attr("x", d => xHist(d.x0) + 1)
        .attr("y", d => yHist(d.length))
        .attr("width", d => Math.max(0, xHist(d.x1) - xHist(d.x0) - 1))
        .attr("height", d => 340 - yHist(d.length)); // 340 is the inner height

    histBrushGroup.raise(); // keep brush on top
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

function updateHighlights() {
    const active = selectedCountries.size > 0;

    mapSvg.selectAll(".country-path").attr("opacity", d => {
        const info = averagedData.find(x => x.Code === d.id);
        return (!active || (info && selectedCountries.has(info.Entity))) ? 1 : 0.2;
    });

    scatterCirclesGroup.selectAll("circle")
        .attr("opacity", d => (!active || selectedCountries.has(d.Entity)) ? 0.7 : 0.05);

    histSvg.selectAll(".hist-bar").attr("opacity", d => {
        const hasSelected = d.some(c => selectedCountries.has(c.Entity));
        return (!active || hasSelected) ? 1 : 0.2;
    });
}