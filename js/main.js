console.log("Hello world");

// ==========================================
// 1. CONFIGURATION & GLOBAL VARIABLES
// ==========================================

let globalData; // Store loaded data globally to access it in filters

// Margin object with properties for the four directions
const margin = {top: 40, right: 50, bottom: 10, left: 50};

// Width and height as the inner dimensions of the chart area
const width = 1000 - margin.left - margin.right;
const height = 1100 - margin.top - margin.bottom;

// ==========================================
// 2. SETUP (CREATE STATIC ELEMENTS ONCE)
// ==========================================

// Add a slider for filtering by year
// Create the Slider ONCE (Position it before or after SVG as preferred)
d3.select("body").append("p").text("Filter by Year: "); // Label
const slider = d3.select("body")
    .append("input")
    .attr("type", "range")
    .attr("min", 2000) // Will be updated dynamically based on data
    .attr("max", 2020)
    .attr("value", 2020)
    .style("width", "300px"); // Make it visible

// Define 'svg' as a child-element (g) from the drawing area and include spaces
// Add <svg> element (drawing space)
const svg = d3.select('body').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

// Hover tooltips
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

// TO DO-SCALES Initialize linear and ordinal scales (input domain and output range)
const xScale = d3.scaleLinear().range([0, width]); // Fixed range to start at 0
const yScale = d3.scaleLinear().range([height, 0]);
const rScale = d3.scaleLinear().range([2, 20]); // Minimum size 2 so points are visible
const colorPalette = d3.scaleOrdinal(d3.schemeTableau10); // TRY OTHER COLOR SCHEMES....

// Initialize Axes groups
const xAxisGroup = svg.append('g').attr('class', 'x-axis');
const yAxisGroup = svg.append('g').attr('class', 'y-axis');

// ==========================================
// 3. DATA LOADING & PROCESSING
// ==========================================

d3.csv('data/combined_gdp_working_hours.csv')
  .then(data => {
    console.log('Data loading complete. Work with dataset.');

    /* {
    "Entity": "Albania",
    "Code": "ALB",
    "Year": "2005",
    "GDP per capita": "6858.4673",
    "GDP per capita (Annotations)": "",
    "Working hours per worker": "2343.9",
    "cost": null
    }    */

    // DATA PROCESSING
    // Convert strings to numbers
    data.forEach(d => {
        d["GDP per capita"] = +d["GDP per capita"];
        d["Working hours per worker"] = +d["Working hours per worker"];
        d["Year"] = +d["Year"];
    });

    globalData = data; // Save to global variable

    // Filter out rows with missing or zero values for working hours and years before 1950
    data = data.filter(d => d.Year >= 1950 && d["Working hours per worker"] > 0);

    // Group the data by country for the secondary chart
    const dataByCountry = groupDataByCountry(data);

    // SET DOMAINS based on full dataset
    xScale.domain(d3.extent(data, d => d["Year"]));
    yScale.domain(d3.extent(data, d => d["Working hours per worker"]));
    rScale.domain(d3.extent(data, d => d["GDP per capita"]));
    
    // TO DO: set the domain of the color palette to be the unique categories in the data.
    colorPalette.domain(dataByCountry.map(d => d[0]));

    // DRAW AXES
    const xAxis = d3.axisTop(xScale).tickFormat(d3.format("d")); // Format year without comma
    const yAxis = d3.axisLeft(yScale);
    
    xAxisGroup.call(xAxis);
    yAxisGroup.call(yAxis);

    // SETUP SLIDER
    const yearExtent = d3.extent(data, d => d.Year);
    slider
        .attr("min", yearExtent[0])
        .attr("max", yearExtent[1])
        .attr("value", yearExtent[1]) // Start at max year
        .on("input", function() {
            // Filter the data based on the selected year and redraw the chart
            updateChart(+this.value);
        });

    // Draw the chart initially with full data
    updateChart(yearExtent[1]); 
})
.catch(error => {
    console.error('Error loading the data ' + error);
});

// ==========================================
// 4. CHART UPDATE LOGIC
// ==========================================

function updateChart(selectedYear){   
    
    // Filter data
    const filteredData = globalData.filter(d => d.Year <= selectedYear);

    // BIND data
    const circles = svg.selectAll('circle')
        .data(filteredData, d => d.Entity); // Use Entity as key for better transitions

    // EXIT (Remove old elements)
    circles.exit().remove();

    // UPDATE (Update existing elements)
    circles
        .attr('cx', d => xScale(d["Year"]))
        .attr('cy', d => yScale(d["Working hours per worker"]))
        .attr('r', d => rScale(d["GDP per capita"]));

    // ENTER (Add new elements)
    circles.enter()
        .append('circle')
        .attr('fill', (d) => colorPalette(d.Entity)) 
        .attr('stroke', "gray")
        .attr('stroke-width', 0)
        .attr('opacity', 0.8)
        .attr('r', d => rScale(d["GDP per capita"]))
        .attr('cy', d => yScale(d["Working hours per worker"])) 
        .attr('cx', d => xScale(d["Year"]))
        // Re-attach listeners to new circles
        .on("mouseover", onMouseOver)
        .on("mousemove", onMouseMove)
        .on("mouseleave", onMouseLeave);
}

// ==========================================
// 5. HELPER FUNCTIONS & EVENT HANDLERS
// ==========================================

function groupDataByCountry(data){
    return d3.groups(data, d => d.Entity);
}

function drawSecondaryChart(data, dataByCountry){
    console.log("Let's draw a chart!!");
}

// When the mouse touches the circle
const onMouseOver = function(event, d) {
    tooltip.transition()
        .duration(200)
        .style("opacity", 1); // Make visible
        
    // Optional: Highlight the circle being hovered
    d3.select(this)
        .attr("stroke", "black")
        .attr("stroke-width", 4);
}

// When the mouse moves (update tooltip position)
const onMouseMove = function(event, d) {
    tooltip.html(`
        <strong>${d.Entity}</strong><br>
        Year: ${d.Year}<br>
        GDP PC: $${d3.format(",.2f")(d["GDP per capita"])}<br>
        Hours: ${d["Working hours per worker"]}
    `)
    .style("left", (event.pageX + 10) + "px") // Offset slightly from mouse
    .style("top", (event.pageY - 10) + "px");
}

// When the mouse leaves the circle
const onMouseLeave = function(event, d) {
    tooltip.transition()
        .duration(500)
        .style("opacity", 0); // Hide
    
    // Reset the circle style
    d3.select(this)
        .attr("stroke", "gray") // Back to original stroke color
        .attr("stroke-width", 0); // Or original width
}